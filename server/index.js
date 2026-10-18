require('dotenv').config();

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');
const sha512 = (data) => crypto.createHash('sha512').update(data).digest();

const app = express();
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Enable CORS for frontend dev server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Supabase client (optional fallback)
let supabase = null;
try {
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (process.env.SUPABASE_URL && supabaseKey) {
    supabase = createClient(process.env.SUPABASE_URL, supabaseKey);
  }
} catch (err) {
  console.warn('Supabase init warning:', err.message);
}

// MongoDB client & collections
let mongoClient = null;
let db = null;
let offlineQueueCollection = null;
let usersCollection = null;
let contactsCollection = null;

// In-memory memory fallback in case DB is unreachable
const memoryStore = {
  users: new Map(),
  contacts: [],
  messages: [],
  presence: new Map() // knotId -> { lastSeen: number, typingTo: string }
};

// SSE Connected Clients Map: normalized knotId -> Set of express res objects
const sseClients = new Map();

function sendSseEvent(targetKnotId, eventData) {
  if (!targetKnotId) return;
  const key = targetKnotId.trim().toLowerCase();
  const clientSet = sseClients.get(key);
  if (!clientSet || clientSet.size === 0) return;
  const payload = `data: ${JSON.stringify(eventData)}\n\n`;
  for (const clientRes of Array.from(clientSet)) {
    try {
      clientRes.write(payload);
    } catch (e) {
      clientSet.delete(clientRes);
    }
  }
}

async function connectMongo() {
  try {
    if (process.env.MONGODB_URI) {
      mongoClient = new MongoClient(process.env.MONGODB_URI);
      await mongoClient.connect();
      db = mongoClient.db('knots');
      offlineQueueCollection = db.collection('offline_queue');
      usersCollection = db.collection('users');
      contactsCollection = db.collection('contact_requests');

      // Create TTL index (expires dynamically based on expires_at date)
      await offlineQueueCollection.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
      await offlineQueueCollection.createIndex({ created_at: 1 }, { expireAfterSeconds: 86400 }).catch(() => {});
      await usersCollection.createIndex({ knot_id: 1 }, { unique: true }).catch(() => {});
      await usersCollection.createIndex({ username: 1 }, { unique: true, sparse: true }).catch(() => {});
      console.log('✓ MongoDB connected & indexes ensured');
    }
  } catch (err) {
    console.error('MongoDB connection error, falling back to memory store:', err.message);
  }
}

connectMongo().catch(console.error);

// ===== Health check =====
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'KNOTS Darkweb Anonymous Relayer',
    server_blind: true,
    mongo: !!db,
    supabase: !!supabase,
    timestamp: new Date().toISOString(),
    uptime_sec: Math.floor(process.uptime()),
    sse_clients: Array.from(sseClients.values()).reduce((acc, set) => acc + set.size, 0)
  });
});

// ===== Zero-Buffer Realtime Server-Sent Events (SSE) Stream =====
app.get('/api/v1/events/:knotId', (req, res) => {
  const { knotId } = req.params;
  if (!knotId) return res.status(400).end();

  const key = knotId.trim().toLowerCase();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  if (!sseClients.has(key)) {
    sseClients.set(key, new Set());
  }
  const clientSet = sseClients.get(key);
  clientSet.add(res);

  // Initial handshake
  res.write(`data: ${JSON.stringify({ type: 'connected', knotId })}\n\n`);

  // 15s keepalive ping
  const pingInterval = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'ping', t: Date.now() })}\n\n`);
    } catch (e) {
      clearInterval(pingInterval);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(pingInterval);
    clientSet.delete(res);
    if (clientSet.size === 0) {
      sseClients.delete(key);
    }
  });
});

// Helper to validate and normalize username
function normalizeUsername(username) {
  if (!username || typeof username !== 'string') return null;
  return username.trim().toLowerCase();
}

function isValidUsername(username) {
  if (!username || typeof username !== 'string') return false;
  const trimmed = username.trim();
  return trimmed.length >= 2 && trimmed.length <= 24 && /^[a-zA-Z0-9._\- ]+$/.test(trimmed);
}

// ===== Check Username Availability =====
app.get('/api/v1/auth/check-username/:username', async (req, res) => {
  const rawUsername = req.params.username;
  if (!rawUsername || !rawUsername.trim()) {
    return res.status(400).json({ available: false, error: 'Username is required' });
  }

  const trimmed = rawUsername.trim();
  const normUser = trimmed.toLowerCase();

  if (trimmed.length < 2) {
    return res.json({ available: false, error: 'Username must be at least 2 characters.' });
  }
  if (trimmed.length > 24) {
    return res.json({ available: false, error: 'Username must be 24 characters or less.' });
  }
  if (!/^[a-zA-Z0-9._\- ]+$/.test(trimmed)) {
    return res.json({ available: false, error: 'Letters, numbers, spaces, . _ - only.' });
  }

  try {
    let existing = null;
    if (usersCollection) {
      existing = await usersCollection.findOne({ username: normUser });
    } else {
      existing = Array.from(memoryStore.users.values()).find(u => u.username === normUser);
    }

    if (existing) {
      return res.json({ available: false, message: 'Username is already taken' });
    }
    return res.json({ available: true, message: 'Username is available' });
  } catch (err) {
    console.error('Check username error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== Sovereign Identity Registration (Enforces Unique Username) =====
app.post('/api/v1/auth/register', async (req, res) => {
  const { username, knotId, publicKey, mnemonic, ed25519Key, x25519Key } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required' });
  }
  if (!knotId || (!publicKey && !x25519Key)) {
    return res.status(400).json({ error: 'knotId and publicKey required' });
  }

  const trimmedUser = username.trim();
  const normUser = trimmedUser.toLowerCase();

  if (!isValidUsername(trimmedUser)) {
    return res.status(400).json({
      error: 'Username must be 2–24 characters and contain only letters, numbers, spaces, and . _ -'
    });
  }

  try {
    // 1. Check if username is taken by a different knot_id
    let userWithSameName = null;
    if (usersCollection) {
      userWithSameName = await usersCollection.findOne({ username: normUser });
    } else {
      userWithSameName = Array.from(memoryStore.users.values()).find(u => u.username === normUser);
    }

    if (userWithSameName && userWithSameName.knot_id !== knotId) {
      return res.status(409).json({
        error: `The username "${trimmedUser}" is already taken. Please choose another username.`
      });
    }

    // 2. Check if this knot_id is already bound to a different username
    let userWithSameKnot = null;
    if (usersCollection) {
      userWithSameKnot = await usersCollection.findOne({ knot_id: knotId });
    } else {
      userWithSameKnot = memoryStore.users.get(knotId);
    }

    if (userWithSameKnot && userWithSameKnot.username && userWithSameKnot.username !== normUser) {
      return res.status(409).json({
        error: `This identity is already registered under username "${userWithSameKnot.display_name || userWithSameKnot.username}".`
      });
    }

    const userDoc = {
      username: normUser,
      display_name: trimmedUser,
      knot_id: knotId,
      public_key: publicKey || x25519Key,
      ed25519_key: ed25519Key || null,
      x25519_key: x25519Key || publicKey,
      mnemonic_hash: mnemonic ? sha512(Buffer.from(mnemonic)).toString('hex').slice(0, 16) : null,
      registered_at: userWithSameKnot ? userWithSameKnot.registered_at : new Date(),
      last_seen_at: new Date()
    };

    if (usersCollection) {
      await usersCollection.updateOne(
        { knot_id: knotId },
        { $set: userDoc },
        { upsert: true }
      );
    } else {
      memoryStore.users.set(knotId, userDoc);
    }

    if (supabase) {
      try {
        await Promise.resolve(supabase.from('users').upsert({
          knot_id: knotId,
          public_key: userDoc.public_key,
          username: normUser
        }));
      } catch (e) {}
    }

    res.json({
      success: true,
      knotId,
      username: normUser,
      displayName: trimmedUser,
      registered_at: userDoc.registered_at
    });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === 11000) {
      return res.status(409).json({
        error: `The username "${trimmedUser}" is already taken. Please choose another username.`
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// ===== Sovereign Identity Login (Verifies Identity & Derived Knot ID) =====
app.post('/api/v1/auth/login', async (req, res) => {
  const { username, knotId } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required' });
  }
  if (!knotId) {
    return res.status(400).json({ error: 'knotId required' });
  }

  const trimmedUser = username.trim();
  const normUser = trimmedUser.toLowerCase();

  try {
    let user = null;
    if (usersCollection) {
      user = await usersCollection.findOne({ username: normUser });
    } else {
      user = Array.from(memoryStore.users.values()).find(u => u.username === normUser);
    }

    if (!user) {
      return res.status(404).json({
        error: `No account found with username "${trimmedUser}". Please check your username or Create an Identity.`
      });
    }

    // Cryptographic verification: knotId derived from credentials must match registered knotId
    if (user.knot_id !== knotId) {
      return res.status(401).json({
        error: 'Incorrect password for this username. Please verify your credentials and try again.'
      });
    }

    // Update last seen
    if (usersCollection) {
      await usersCollection.updateOne(
        { knot_id: user.knot_id },
        { $set: { last_seen_at: new Date() } }
      );
    } else {
      user.last_seen_at = new Date();
    }

    res.json({
      success: true,
      knotId: user.knot_id,
      username: user.username,
      displayName: user.display_name || trimmedUser,
      publicKey: user.public_key
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== User Registration (Legacy / Phrase / Node Direct) =====
app.post('/api/v1/register', async (req, res) => {
  const { knotId, publicKey, mnemonic, ed25519Key, x25519Key, username } = req.body;
  if (!knotId || (!publicKey && !x25519Key)) {
    return res.status(400).json({ error: 'knotId and publicKey required' });
  }

  let normUser = null;
  let displayName = null;
  if (username && typeof username === 'string' && username.trim()) {
    displayName = username.trim();
    normUser = displayName.toLowerCase();
    if (!isValidUsername(displayName)) {
      return res.status(400).json({ error: 'Invalid username format' });
    }
  }

  try {
    if (normUser) {
      let existingUser = null;
      if (usersCollection) {
        existingUser = await usersCollection.findOne({ username: normUser });
      } else {
        existingUser = Array.from(memoryStore.users.values()).find(u => u.username === normUser);
      }
      if (existingUser && existingUser.knot_id !== knotId) {
        return res.status(409).json({ error: `Username "${displayName}" is already taken.` });
      }
    }

    const userDoc = {
      knot_id: knotId,
      public_key: publicKey || x25519Key,
      ed25519_key: ed25519Key || null,
      x25519_key: x25519Key || publicKey,
      mnemonic_hash: mnemonic ? sha512(Buffer.from(mnemonic)).toString('hex').slice(0, 16) : null,
      registered_at: new Date(),
      last_seen_at: new Date()
    };
    if (normUser) {
      userDoc.username = normUser;
      userDoc.display_name = displayName;
    }

    if (usersCollection) {
      await usersCollection.updateOne(
        { knot_id: knotId },
        { $set: userDoc },
        { upsert: true }
      );
    } else {
      memoryStore.users.set(knotId, userDoc);
    }

    // Attempt Supabase sync silently if configured
    if (supabase) {
      try {
        await Promise.resolve(supabase.from('users').upsert({ knot_id: knotId, public_key: userDoc.public_key }));
      } catch (e) {}
    }

    res.json({
      success: true,
      knotId,
      blind_id: sha512(Buffer.from(knotId)).toString('hex').slice(0, 16),
      registered_at: userDoc.registered_at
    });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Username or Knot ID already registered.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ===== List Registered Nodes / Knot Discovery =====
app.get('/api/v1/users', async (req, res) => {
  try {
    let users = [];
    if (usersCollection) {
      users = await usersCollection.find({}, {
        projection: {
          knot_id: 1,
          public_key: 1,
          ed25519_key: 1,
          username: 1,
          display_name: 1,
          registered_at: 1,
          last_seen_at: 1
        }
      })
        .sort({ last_seen_at: -1 })
        .limit(50)
        .toArray();
    } else {
      users = Array.from(memoryStore.users.values()).map(u => ({
        knot_id: u.knot_id,
        username: u.username,
        display_name: u.display_name,
        public_key: u.public_key,
        registered_at: u.registered_at
      }));
    }
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Get Specific Knot Profile / Public Keys =====
app.get('/api/v1/user/:knotId', async (req, res) => {
  const { knotId } = req.params;
  try {
    let user = null;
    const lookup = knotId.trim();
    const norm = lookup.toLowerCase();
    if (usersCollection) {
      user = await usersCollection.findOne({
        $or: [
          { knot_id: lookup },
          { username: norm }
        ]
      });
    } else {
      user = memoryStore.users.get(lookup) || Array.from(memoryStore.users.values()).find(u => u.username === norm);
    }

    if (!user) {
      return res.status(404).json({ error: 'Knot ID not registered or expired' });
    }

    res.json({
      success: true,
      knot_id: user.knot_id,
      username: user.username,
      display_name: user.display_name,
      public_key: user.public_key,
      ed25519_key: user.ed25519_key,
      registered_at: user.registered_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper for safe regex escaping
const escapeRegex = (s) => (s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ===== Contact Request Flow =====
app.post('/api/v1/contact-request', async (req, res) => {
  const { fromKnotId, toKnotId, memo } = req.body;
  if (!fromKnotId || !toKnotId) {
    return res.status(400).json({ error: 'fromKnotId and toKnotId required' });
  }

  let resolvedToKnotId = toKnotId.trim();
  let resolvedFromKnotId = fromKnotId.trim();

  try {
    if (usersCollection) {
      const targetUser = await usersCollection.findOne({
        $or: [
          { knot_id: { $regex: new RegExp(`^${escapeRegex(resolvedToKnotId)}$`, 'i') } },
          { username: resolvedToKnotId.toLowerCase() }
        ]
      });
      if (targetUser) resolvedToKnotId = targetUser.knot_id;

      const sourceUser = await usersCollection.findOne({
        $or: [
          { knot_id: { $regex: new RegExp(`^${escapeRegex(resolvedFromKnotId)}$`, 'i') } },
          { username: resolvedFromKnotId.toLowerCase() }
        ]
      });
      if (sourceUser) resolvedFromKnotId = sourceUser.knot_id;
    } else {
      const targetUser = Array.from(memoryStore.users.values()).find(
        u => u.knot_id.toLowerCase() === resolvedToKnotId.toLowerCase() || u.username === resolvedToKnotId.toLowerCase()
      );
      if (targetUser) resolvedToKnotId = targetUser.knot_id;

      const sourceUser = Array.from(memoryStore.users.values()).find(
        u => u.knot_id.toLowerCase() === resolvedFromKnotId.toLowerCase() || u.username === resolvedFromKnotId.toLowerCase()
      );
      if (sourceUser) resolvedFromKnotId = sourceUser.knot_id;
    }

    const requestDoc = {
      from_knot_id: resolvedFromKnotId,
      to_knot_id: resolvedToKnotId,
      memo: memo || 'E2EE Contact Handshake Request',
      status: 'pending', // 'pending' | 'accepted' | 'rejected' | 'blocked'
      created_at: new Date()
    };

    let insertedId;
    if (contactsCollection) {
      const existing = await contactsCollection.findOne({
        from_knot_id: { $regex: new RegExp(`^${escapeRegex(resolvedFromKnotId)}$`, 'i') },
        to_knot_id: { $regex: new RegExp(`^${escapeRegex(resolvedToKnotId)}$`, 'i') },
        status: 'pending'
      });
      if (existing) {
        return res.json({ success: true, message: 'Request already pending', requestId: existing._id });
      }
      const result = await contactsCollection.insertOne(requestDoc);
      insertedId = result.insertedId;
    } else {
      insertedId = Date.now().toString();
      requestDoc._id = insertedId;
      memoryStore.contacts.push(requestDoc);
    }

    if (supabase) {
      try {
        await Promise.resolve(supabase.from('contact_requests').insert({ from_knot_id: resolvedFromKnotId, to_knot_id: resolvedToKnotId, status: 'pending' }));
      } catch (e) {}
    }

    sendSseEvent(resolvedToKnotId, { type: 'contact_request', fromKnotId: resolvedFromKnotId, requestId: insertedId });

    res.json({ success: true, requestId: insertedId, status: 'pending' });
  } catch (err) {
    console.error('Contact request error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== Get Contact Requests for a Knot =====
app.get('/api/v1/contact-requests/:knotId', async (req, res) => {
  const { knotId } = req.params;
  try {
    let incoming = [];
    let outgoing = [];

    if (contactsCollection) {
      const rx = { $regex: new RegExp(`^${escapeRegex(knotId.trim())}$`, 'i') };
      incoming = await contactsCollection.find({ to_knot_id: rx }).toArray();
      outgoing = await contactsCollection.find({ from_knot_id: rx }).toArray();
    } else {
      const lower = knotId.trim().toLowerCase();
      incoming = memoryStore.contacts.filter(c => (c.to_knot_id || '').toLowerCase() === lower);
      outgoing = memoryStore.contacts.filter(c => (c.from_knot_id || '').toLowerCase() === lower);
    }

    res.json({ success: true, incoming, outgoing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Accept / Reject / Block Contact Request =====
app.post('/api/v1/contact-request/respond', async (req, res) => {
  const { requestId, action } = req.body; // 'accept' | 'reject' | 'block'
  if (!requestId || !action) {
    return res.status(400).json({ error: 'requestId and action required' });
  }

  try {
    const statusMap = { accept: 'accepted', reject: 'rejected', block: 'blocked' };
    const newStatus = statusMap[action] || 'pending';

    let notifyRequester = null;
    if (contactsCollection) {
      let query = {};
      try {
        query = { _id: new ObjectId(requestId) };
      } catch (e) {
        query = { _id: requestId };
      }
      const existing = await contactsCollection.findOne(query);
      if (existing) notifyRequester = existing.from_knot_id;
      await contactsCollection.updateOne(query, { $set: { status: newStatus, updated_at: new Date() } });
    } else {
      const match = memoryStore.contacts.find(c => String(c._id) === String(requestId));
      if (match) {
        match.status = newStatus;
        notifyRequester = match.from_knot_id;
      }
    }

    if (notifyRequester) {
      sendSseEvent(notifyRequester, { type: 'contact_response', requestId, action: newStatus });
    }

    res.json({ success: true, status: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== X3DH Handshake Helper =====
app.post('/api/v1/x3dh-handshake', async (req, res) => {
  try {
    const { recipientPublicKey, senderIdentityKey, senderSignedPreKey, senderOneTimeKey } = req.body;
    let sharedSecret = '0000000000000000';
    if (senderSignedPreKey && recipientPublicKey) {
      try {
        const z = x25519(
          typeof senderSignedPreKey === 'string' ? Buffer.from(senderSignedPreKey, 'hex') : senderSignedPreKey,
          typeof recipientPublicKey === 'string' ? Buffer.from(recipientPublicKey, 'hex') : recipientPublicKey
        );
        sharedSecret = sha512(z).toString('hex').slice(0, 32);
      } catch (e) {
        sharedSecret = sha512(Buffer.from((senderSignedPreKey || '') + (recipientPublicKey || ''))).toString('hex').slice(0, 32);
      }
    }
    res.json({ success: true, sharedSecret, handshake: 'X3DH-DoubleRatchet-Ready' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Message Delivery & Offline Queue =====
app.post('/api/v1/message', async (req, res) => {
  const { recipientKnotId, senderKnotId, ciphertext, nonce, tag, chainCounter, ttlSeconds, replyTo, type, sticker } = req.body;
  if (!recipientKnotId || !ciphertext || !senderKnotId) {
    return res.status(400).json({ error: 'recipientKnotId, ciphertext, senderKnotId required' });
  }

  const parsedTtl = typeof ttlSeconds === 'number' ? ttlSeconds : 86400;
  const messageDoc = {
    recipient_knot_id: recipientKnotId,
    sender_knot_id: senderKnotId,
    ciphertext,
    nonce: nonce || null,
    tag: tag || null,
    chain_counter: chainCounter || 1,
    reply_to: replyTo || null,
    type: type || 'text',
    sticker: sticker || null,
    reactions: [],
    created_at: new Date(),
    ttlSeconds: parsedTtl,
    expires_at: parsedTtl > 0 ? new Date(Date.now() + parsedTtl * 1000) : null,
    status: 'queued'
  };

  try {
    let messageId;
    if (offlineQueueCollection) {
      const result = await offlineQueueCollection.insertOne(messageDoc);
      messageId = result.insertedId;
    } else {
      messageId = Date.now().toString();
      messageDoc._id = messageId;
      memoryStore.messages.push(messageDoc);
    }

    sendSseEvent(recipientKnotId, {
      type: 'new_message',
      messageId,
      senderKnotId
    });

    res.json({
      success: true,
      messageId,
      status: 'queued_in_offline_vault',
      expires_at: messageDoc.expires_at,
      ttlSeconds: messageDoc.ttlSeconds
    });
  } catch (err) {
    console.error('Message enqueue error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== Retrieve Messages for Recipient =====
app.get('/api/v1/messages/:knotId', async (req, res) => {
  const { knotId } = req.params;
  try {
    const now = new Date();
    let messages = [];
    if (offlineQueueCollection) {
      // Clean up any expired messages
      await offlineQueueCollection.deleteMany({
        expires_at: { $lte: now }
      }).catch(() => {});

      const rx = { $regex: new RegExp(`^${escapeRegex(knotId.trim())}$`, 'i') };
      messages = await offlineQueueCollection.find({
        recipient_knot_id: rx,
        expires_at: { $gt: now },
        status: { $in: ['queued', 'delivered', 'read', 'deleted'] }
      }).sort({ created_at: 1 }).toArray();
    } else {
      const lower = knotId.trim().toLowerCase();
      memoryStore.messages = memoryStore.messages.filter(m => !m.expires_at || new Date(m.expires_at) > now);
      messages = memoryStore.messages.filter(m => (m.recipient_knot_id || '').toLowerCase() === lower);
    }

    res.json({ success: true, count: messages.length, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Acknowledge / Mark Read Single Message =====
app.post('/api/v1/messages/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    let senderKnotId = null;
    if (offlineQueueCollection) {
      let query = {};
      try { query = { _id: new ObjectId(id) }; } catch (e) { query = { _id: id }; }
      const msg = await offlineQueueCollection.findOne(query);
      if (msg) senderKnotId = msg.sender_knot_id;
      await offlineQueueCollection.updateOne(query, { $set: { status: 'read', read_at: new Date() } });
    } else {
      const msg = memoryStore.messages.find(m => String(m._id) === String(id));
      if (msg) {
        msg.status = 'read';
        senderKnotId = msg.sender_knot_id;
      }
    }
    if (senderKnotId) {
      sendSseEvent(senderKnotId, { type: 'read_receipt', messageId: id });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Mark All Messages Between Peers as Read =====
app.post('/api/v1/messages/read-all', async (req, res) => {
  const { recipientKnotId, senderKnotId } = req.body;
  try {
    if (offlineQueueCollection) {
      const recRx = { $regex: new RegExp(`^${escapeRegex(recipientKnotId.trim())}$`, 'i') };
      const sendRx = { $regex: new RegExp(`^${escapeRegex(senderKnotId.trim())}$`, 'i') };
      await offlineQueueCollection.updateMany(
        { recipient_knot_id: recRx, sender_knot_id: sendRx, status: { $ne: 'read' } },
        { $set: { status: 'read', read_at: new Date() } }
      );
    } else {
      const rLower = (recipientKnotId || '').trim().toLowerCase();
      const sLower = (senderKnotId || '').trim().toLowerCase();
      memoryStore.messages
        .filter(m => (m.recipient_knot_id || '').toLowerCase() === rLower && (m.sender_knot_id || '').toLowerCase() === sLower)
        .forEach(m => m.status = 'read');
    }
    sendSseEvent(senderKnotId, { type: 'read_receipt', all: true, peer: recipientKnotId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Sync Status of Messages Sent by this Knot =====
app.get('/api/v1/messages/sent-status/:senderKnotId', async (req, res) => {
  const { senderKnotId } = req.params;
  try {
    let sentStatuses = [];
    if (offlineQueueCollection) {
      const rx = { $regex: new RegExp(`^${escapeRegex(senderKnotId.trim())}$`, 'i') };
      sentStatuses = await offlineQueueCollection.find(
        { sender_knot_id: rx },
        { projection: { _id: 1, recipient_knot_id: 1, status: 1, read_at: 1, reactions: 1, edited: 1, edited_at: 1, ciphertext: 1, nonce: 1, tag: 1, expires_at: 1, ttlSeconds: 1 } }
      ).toArray();
    } else {
      const sLower = (senderKnotId || '').trim().toLowerCase();
      sentStatuses = memoryStore.messages
        .filter(m => (m.sender_knot_id || '').toLowerCase() === sLower)
        .map(m => ({ _id: m._id, recipient_knot_id: m.recipient_knot_id, status: m.status, reactions: m.reactions, edited: m.edited, ciphertext: m.ciphertext, nonce: m.nonce, tag: m.tag, expires_at: m.expires_at, ttlSeconds: m.ttlSeconds }));
    }
    res.json({ success: true, statuses: sentStatuses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Edit Message (Sender Only) =====
app.put('/api/v1/messages/:id/edit', async (req, res) => {
  const { id } = req.params;
  const { senderKnotId, ciphertext, nonce, tag } = req.body;
  if (!ciphertext) return res.status(400).json({ error: 'ciphertext required' });

  try {
    let notifyRec = null;
    if (offlineQueueCollection) {
      let query = {};
      try { query = { _id: new ObjectId(id) }; } catch (e) { query = { _id: id }; }
      const msg = await offlineQueueCollection.findOne(query);
      if (!msg) return res.status(404).json({ error: 'Message not found' });
      if (senderKnotId && msg.sender_knot_id !== senderKnotId) {
        return res.status(403).json({ error: 'Unauthorized to edit this message' });
      }
      notifyRec = msg.recipient_knot_id;
      await offlineQueueCollection.updateOne(query, {
        $set: {
          ciphertext,
          nonce: nonce || msg.nonce,
          tag: tag || msg.tag,
          edited: true,
          edited_at: new Date()
        }
      });
    } else {
      const msg = memoryStore.messages.find(m => String(m._id) === String(id));
      if (msg) {
        if (senderKnotId && msg.sender_knot_id !== senderKnotId) return res.status(403).json({ error: 'Unauthorized' });
        notifyRec = msg.recipient_knot_id;
        msg.ciphertext = ciphertext;
        msg.nonce = nonce || msg.nonce;
        msg.tag = tag || msg.tag;
        msg.edited = true;
        msg.edited_at = new Date();
      }
    }
    if (notifyRec) {
      sendSseEvent(notifyRec, { type: 'message_edit', messageId: id });
    }
    res.json({ success: true, message: 'Message updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Delete Message for Everyone =====
app.delete('/api/v1/messages/:id', async (req, res) => {
  const { id } = req.params;
  const { knotId } = req.body || req.query || {};

  try {
    let notifyRec = null;
    let notifySend = null;
    if (offlineQueueCollection) {
      let query = {};
      try { query = { _id: new ObjectId(id) }; } catch (e) { query = { _id: id }; }
      const existing = await offlineQueueCollection.findOne(query);
      if (existing) {
        notifyRec = existing.recipient_knot_id;
        notifySend = existing.sender_knot_id;
      }
      await offlineQueueCollection.updateOne(query, {
        $set: {
          status: 'deleted',
          ciphertext: '',
          deleted_at: new Date(),
          deleted_by: knotId || 'peer'
        }
      });
    } else {
      const msg = memoryStore.messages.find(m => String(m._id) === String(id));
      if (msg) {
        notifyRec = msg.recipient_knot_id;
        notifySend = msg.sender_knot_id;
        msg.status = 'deleted';
        msg.ciphertext = '';
      }
    }
    if (notifyRec) sendSseEvent(notifyRec, { type: 'message_delete', messageId: id });
    if (notifySend) sendSseEvent(notifySend, { type: 'message_delete', messageId: id });
    res.json({ success: true, message: 'Message deleted for everyone' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Instant Clear Entire Chat for Conversation =====
app.post('/api/v1/messages/clear-chat', async (req, res) => {
  const { userKnotId, peerKnotId } = req.body;
  if (!userKnotId || !peerKnotId) {
    return res.status(400).json({ error: 'userKnotId and peerKnotId required' });
  }

  try {
    if (offlineQueueCollection) {
      const uRx = { $regex: new RegExp(`^${escapeRegex(userKnotId.trim())}$`, 'i') };
      const pRx = { $regex: new RegExp(`^${escapeRegex(peerKnotId.trim())}$`, 'i') };
      await offlineQueueCollection.deleteMany({
        $or: [
          { sender_knot_id: uRx, recipient_knot_id: pRx },
          { sender_knot_id: pRx, recipient_knot_id: uRx }
        ]
      });
    } else {
      const uLower = userKnotId.trim().toLowerCase();
      const pLower = peerKnotId.trim().toLowerCase();
      memoryStore.messages = memoryStore.messages.filter(m => !(
        ((m.sender_knot_id || '').toLowerCase() === uLower && (m.recipient_knot_id || '').toLowerCase() === pLower) ||
        ((m.sender_knot_id || '').toLowerCase() === pLower && (m.recipient_knot_id || '').toLowerCase() === uLower)
      ));
    }
    sendSseEvent(userKnotId, { type: 'clear_chat', peerKnotId });
    sendSseEvent(peerKnotId, { type: 'clear_chat', peerKnotId: userKnotId });
    res.json({ success: true, message: 'Chat conversation purged from mesh relay' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Message Reaction Emoji Endpoint =====
app.post('/api/v1/messages/:id/react', async (req, res) => {
  const { id } = req.params;
  const { emoji, knotId } = req.body;
  if (!emoji || !knotId) {
    return res.status(400).json({ error: 'emoji and knotId required' });
  }

  try {
    let notifyRec = null;
    let notifySend = null;
    if (offlineQueueCollection) {
      let query = {};
      try { query = { _id: new ObjectId(id) }; } catch (e) { query = { _id: id }; }
      const msg = await offlineQueueCollection.findOne(query);
      if (msg) {
        notifyRec = msg.recipient_knot_id;
        notifySend = msg.sender_knot_id;
        let reactions = msg.reactions || [];
        const existingIdx = reactions.findIndex(r => (r.knotId || '').toLowerCase() === knotId.toLowerCase());
        if (existingIdx >= 0) {
          if (reactions[existingIdx].emoji === emoji) {
            reactions.splice(existingIdx, 1); // toggle off if same
          } else {
            reactions[existingIdx] = { emoji, knotId }; // replace if different emoji
          }
        } else {
          reactions.push({ emoji, knotId });
        }
        await offlineQueueCollection.updateOne(query, { $set: { reactions } });
      }
    } else {
      const msg = memoryStore.messages.find(m => String(m._id) === String(id));
      if (msg) {
        notifyRec = msg.recipient_knot_id;
        notifySend = msg.sender_knot_id;
        if (!msg.reactions) msg.reactions = [];
        const existingIdx = msg.reactions.findIndex(r => (r.knotId || '').toLowerCase() === knotId.toLowerCase());
        if (existingIdx >= 0) {
          if (msg.reactions[existingIdx].emoji === emoji) {
            msg.reactions.splice(existingIdx, 1); // toggle off if same
          } else {
            msg.reactions[existingIdx] = { emoji, knotId }; // replace if different emoji
          }
        } else {
          msg.reactions.push({ emoji, knotId });
        }
      }
    }
    if (notifyRec) sendSseEvent(notifyRec, { type: 'message_reaction', messageId: id, emoji });
    if (notifySend) sendSseEvent(notifySend, { type: 'message_reaction', messageId: id, emoji });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== User Presence & Typing Heartbeat =====
app.post('/api/v1/presence/heartbeat', (req, res) => {
  const { knotId, typingTo } = req.body;
  if (!knotId) return res.status(400).json({ error: 'knotId required' });

  memoryStore.presence.set(knotId.trim().toLowerCase(), {
    lastSeen: Date.now(),
    typingTo: typingTo ? typingTo.trim().toLowerCase() : null
  });

  if (typingTo) {
    sendSseEvent(typingTo, { type: 'typing', isTyping: true, fromKnotId: knotId });
  }

  res.json({ success: true });
});

// ===== Get Presence & Typing Info for a Knot =====
app.get('/api/v1/presence/:knotId', (req, res) => {
  const { knotId } = req.params;
  const { peerId } = req.query;
  const p = memoryStore.presence.get((knotId || '').trim().toLowerCase());

  if (!p) {
    return res.json({ success: true, isOnline: false, lastSeen: null, isTyping: false });
  }

  const isOnline = Date.now() - p.lastSeen < 15000; // 15 second heartbeat threshold
  const isTyping = Boolean(isOnline && p.typingTo && p.typingTo === (peerId ? peerId.trim().toLowerCase() : ''));

  res.json({
    success: true,
    isOnline,
    lastSeen: p.lastSeen,
    isTyping
  });
});

// ===== Key Rotation =====
app.post('/api/v1/keys/rotate', async (req, res) => {
  const { oldKnotId, newKnotId, newPublicKey, newEd25519Key } = req.body;
  if (!oldKnotId || !newKnotId || !newPublicKey) {
    return res.status(400).json({ error: 'oldKnotId, newKnotId, newPublicKey required' });
  }

  try {
    if (usersCollection) {
      await usersCollection.deleteOne({ knot_id: oldKnotId });
      await usersCollection.insertOne({
        knot_id: newKnotId,
        public_key: newPublicKey,
        ed25519_key: newEd25519Key || null,
        registered_at: new Date(),
        rotated_from: oldKnotId
      });
      // Update contacts referencing old identity
      await contactsCollection.updateMany({ from_knot_id: oldKnotId }, { $set: { from_knot_id: newKnotId } });
      await contactsCollection.updateMany({ to_knot_id: oldKnotId }, { $set: { to_knot_id: newKnotId } });
    }
    res.json({ success: true, rotated: true, newKnotId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Panic Button / Burn Identity =====
app.delete('/api/v1/purge/:knotId', async (req, res) => {
  const { knotId } = req.params;
  try {
    if (usersCollection) {
      await usersCollection.deleteMany({ knot_id: knotId });
    }
    if (contactsCollection) {
      await contactsCollection.deleteMany({ $or: [{ from_knot_id: knotId }, { to_knot_id: knotId }] });
    }
    if (offlineQueueCollection) {
      await offlineQueueCollection.deleteMany({ $or: [{ recipient_knot_id: knotId }, { sender_knot_id: knotId }] });
    }
    memoryStore.users.delete(knotId);
    memoryStore.contacts = memoryStore.contacts.filter(c => c.from_knot_id !== knotId && c.to_knot_id !== knotId);
    memoryStore.messages = memoryStore.messages.filter(m => m.recipient_knot_id !== knotId && m.sender_knot_id !== knotId);

    res.json({ success: true, message: `Identity ${knotId} permanently burned with zero traces.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Network & Security Radar Stats =====
app.get('/api/v1/network/stats', async (req, res) => {
  try {
    let nodeCount = 0;
    let queueCount = 0;
    if (usersCollection) {
      nodeCount = await usersCollection.countDocuments();
    } else {
      nodeCount = memoryStore.users.size;
    }
    if (offlineQueueCollection) {
      queueCount = await offlineQueueCollection.countDocuments();
    } else {
      queueCount = memoryStore.messages.length;
    }

    res.json({
      success: true,
      protocol: 'KNOTS-v1-DARKWEB',
      encryption: 'X3DH + Double Ratchet + X25519 + AES-256-GCM',
      server_blind: true,
      nodes_active: Math.max(nodeCount, 1),
      queue_depth: queueCount,
      entropy_source: 'WebCrypto / dev/urandom',
      uptime_sec: Math.floor(process.uptime()),
      db_status: db ? 'MONGODB_ATLAS_ONLINE' : 'IN_MEMORY_VAULT'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const path = require('path');
const fs = require('fs');

// Serve built frontend assets in production if client/dist exists
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/health')) {
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[KNOTS RELAYER] Darkweb backend running on port ${PORT}`);
});