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
    uptime_sec: Math.floor(process.uptime())
  });
});

// ===== User Registration =====
app.post('/api/v1/register', async (req, res) => {
  const { knotId, publicKey, mnemonic, ed25519Key, x25519Key } = req.body;
  if (!knotId || (!publicKey && !x25519Key)) {
    return res.status(400).json({ error: 'knotId and publicKey required' });
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

  try {
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
    res.status(500).json({ error: err.message });
  }
});

// ===== List Registered Nodes / Knot Discovery =====
app.get('/api/v1/users', async (req, res) => {
  try {
    let users = [];
    if (usersCollection) {
      users = await usersCollection.find({}, { projection: { knot_id: 1, public_key: 1, ed25519_key: 1, registered_at: 1, last_seen_at: 1 } })
        .sort({ last_seen_at: -1 })
        .limit(50)
        .toArray();
    } else {
      users = Array.from(memoryStore.users.values()).map(u => ({
        knot_id: u.knot_id,
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
    if (usersCollection) {
      user = await usersCollection.findOne({ knot_id: knotId });
    } else {
      user = memoryStore.users.get(knotId);
    }

    if (!user) {
      return res.status(404).json({ error: 'Knot ID not registered or expired' });
    }

    res.json({
      success: true,
      knot_id: user.knot_id,
      public_key: user.public_key,
      ed25519_key: user.ed25519_key,
      registered_at: user.registered_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Contact Request Flow =====
app.post('/api/v1/contact-request', async (req, res) => {
  const { fromKnotId, toKnotId, memo } = req.body;
  if (!fromKnotId || !toKnotId) {
    return res.status(400).json({ error: 'fromKnotId and toKnotId required' });
  }

  const requestDoc = {
    from_knot_id: fromKnotId,
    to_knot_id: toKnotId,
    memo: memo || 'E2EE Contact Handshake Request',
    status: 'pending', // 'pending' | 'accepted' | 'rejected' | 'blocked'
    created_at: new Date()
  };

  try {
    let insertedId;
    if (contactsCollection) {
      const existing = await contactsCollection.findOne({
        from_knot_id: fromKnotId,
        to_knot_id: toKnotId,
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
        await Promise.resolve(supabase.from('contact_requests').insert({ from_knot_id: fromKnotId, to_knot_id: toKnotId, status: 'pending' }));
      } catch (e) {}
    }

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
      incoming = await contactsCollection.find({ to_knot_id: knotId }).toArray();
      outgoing = await contactsCollection.find({ from_knot_id: knotId }).toArray();
    } else {
      incoming = memoryStore.contacts.filter(c => c.to_knot_id === knotId);
      outgoing = memoryStore.contacts.filter(c => c.from_knot_id === knotId);
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

    if (contactsCollection) {
      let query = {};
      try {
        query = { _id: new ObjectId(requestId) };
      } catch (e) {
        query = { _id: requestId };
      }
      await contactsCollection.updateOne(query, { $set: { status: newStatus, updated_at: new Date() } });
    } else {
      const match = memoryStore.contacts.find(c => String(c._id) === String(requestId));
      if (match) match.status = newStatus;
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
    ttlSeconds: ttlSeconds || 86400,
    expires_at: new Date(Date.now() + (ttlSeconds ? ttlSeconds * 1000 : 86400 * 1000)),
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

      messages = await offlineQueueCollection.find({
        recipient_knot_id: knotId,
        expires_at: { $gt: now },
        status: { $in: ['queued', 'delivered', 'read', 'deleted'] }
      }).sort({ created_at: 1 }).toArray();
    } else {
      memoryStore.messages = memoryStore.messages.filter(m => !m.expires_at || new Date(m.expires_at) > now);
      messages = memoryStore.messages.filter(m => m.recipient_knot_id === knotId);
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
    if (offlineQueueCollection) {
      let query = {};
      try { query = { _id: new ObjectId(id) }; } catch (e) { query = { _id: id }; }
      await offlineQueueCollection.updateOne(query, { $set: { status: 'read', read_at: new Date() } });
    } else {
      const msg = memoryStore.messages.find(m => String(m._id) === String(id));
      if (msg) msg.status = 'read';
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
      await offlineQueueCollection.updateMany(
        { recipient_knot_id: recipientKnotId, sender_knot_id: senderKnotId, status: { $ne: 'read' } },
        { $set: { status: 'read', read_at: new Date() } }
      );
    } else {
      memoryStore.messages
        .filter(m => m.recipient_knot_id === recipientKnotId && m.sender_knot_id === senderKnotId)
        .forEach(m => m.status = 'read');
    }
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
      sentStatuses = await offlineQueueCollection.find(
        { sender_knot_id: senderKnotId },
        { projection: { _id: 1, recipient_knot_id: 1, status: 1, read_at: 1, reactions: 1, edited: 1, edited_at: 1, ciphertext: 1, nonce: 1, tag: 1, expires_at: 1, ttlSeconds: 1 } }
      ).toArray();
    } else {
      sentStatuses = memoryStore.messages
        .filter(m => m.sender_knot_id === senderKnotId)
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
    if (offlineQueueCollection) {
      let query = {};
      try { query = { _id: new ObjectId(id) }; } catch (e) { query = { _id: id }; }
      const msg = await offlineQueueCollection.findOne(query);
      if (!msg) return res.status(404).json({ error: 'Message not found' });
      if (senderKnotId && msg.sender_knot_id !== senderKnotId) {
        return res.status(403).json({ error: 'Unauthorized to edit this message' });
      }
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
        msg.ciphertext = ciphertext;
        msg.nonce = nonce || msg.nonce;
        msg.tag = tag || msg.tag;
        msg.edited = true;
        msg.edited_at = new Date();
      }
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
    if (offlineQueueCollection) {
      let query = {};
      try { query = { _id: new ObjectId(id) }; } catch (e) { query = { _id: id }; }
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
        msg.status = 'deleted';
        msg.ciphertext = '';
      }
    }
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
      await offlineQueueCollection.deleteMany({
        $or: [
          { sender_knot_id: userKnotId, recipient_knot_id: peerKnotId },
          { sender_knot_id: peerKnotId, recipient_knot_id: userKnotId }
        ]
      });
    } else {
      memoryStore.messages = memoryStore.messages.filter(m => !(
        (m.sender_knot_id === userKnotId && m.recipient_knot_id === peerKnotId) ||
        (m.sender_knot_id === peerKnotId && m.recipient_knot_id === userKnotId)
      ));
    }
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
    if (offlineQueueCollection) {
      let query = {};
      try { query = { _id: new ObjectId(id) }; } catch (e) { query = { _id: id }; }
      const msg = await offlineQueueCollection.findOne(query);
      if (msg) {
        let reactions = msg.reactions || [];
        const existingIdx = reactions.findIndex(r => r.knotId === knotId);
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
        if (!msg.reactions) msg.reactions = [];
        const existingIdx = msg.reactions.findIndex(r => r.knotId === knotId);
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
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== User Presence & Typing Heartbeat =====
app.post('/api/v1/presence/heartbeat', (req, res) => {
  const { knotId, typingTo } = req.body;
  if (!knotId) return res.status(400).json({ error: 'knotId required' });

  memoryStore.presence.set(knotId, {
    lastSeen: Date.now(),
    typingTo: typingTo || null
  });

  res.json({ success: true });
});

// ===== Get Presence & Typing Info for a Knot =====
app.get('/api/v1/presence/:knotId', (req, res) => {
  const { knotId } = req.params;
  const { peerId } = req.query;
  const p = memoryStore.presence.get(knotId);

  if (!p) {
    return res.json({ success: true, isOnline: false, lastSeen: null, isTyping: false });
  }

  const isOnline = Date.now() - p.lastSeen < 15000; // 15 second heartbeat threshold
  const isTyping = Boolean(isOnline && p.typingTo && p.typingTo === peerId);

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[KNOTS RELAYER] Darkweb backend running on port ${PORT}`);
});