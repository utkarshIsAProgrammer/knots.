require('dotenv').config();

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { x25519 } = require('@stablelib/x25519');
const { randomBytes } = require('@stablelib/random');
const { sha512 } = require('@stablelib/sha512');

const app = express();
app.use(express.json());

// Supabase client (may fail without real creds, but we check setup)
let supabase;
try {
  supabase = createClient(
    process.env.SUPABASE_URL || 'http://localhost:54321',
    process.env.SUPABASE_ANON_KEY || 'test anon key'
  );
  console.log('Supabase client created');
} catch (e) {
  console.log('Supabase client init (expected without real creds):', e.message);
}

// MongoDB client
let mongoClient = null;
let offlineQueueCollection = null;

async function connectMongo() {
  if (!mongoClient) {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
  }
  const db = mongoClient.db('knots');
  offlineQueueCollection = db.collection('offline_queue');
  await offlineQueueCollection.createIndex({ created_at: 1 }, { expireAfterSeconds: 86400 });
  console.log('MongoDB connected with TTL index');
}

connectMongo().catch(console.error);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Registration endpoint
app.post('/api/v1/register', async (req, res) => {
  const { knotId, publicKey } = req.body;
  if (!knotId || !publicKey) {
    return res.status(400).json({ error: 'knotId and publicKey required' });
  }
  try {
    const { error } = await supabase
      .from('users')
      .upsert({ knot_id: knotId, public_key: publicKey });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, knotId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Contact request endpoint
app.post('/api/v1/contact-request', async (req, res) => {
  const { fromKnotId, toKnotId } = req.body;
  if (!fromKnotId || !toKnotId) {
    return res.status(400).json({ error: 'fromKnotId and toKnotId required' });
  }
  try {
    const { error } = await supabase
      .from('contact_requests')
      .insert({ from_knot_id: fromKnotId, to_knot_id: toKnotId, status: 'pending' });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// X3DH handshake endpoint
app.post('/api/v1/x3dh-handshake', async (req, res) => {
  try {
    const { recipientPublicKey, senderIdentityKey, senderSignedPreKey, senderOneTimeKey } = req.body;
    // X3DH shared secret computation
    const z = x25519(senderSignedPreKey, recipientPublicKey);
    const sharedSecret = sha512(Buffer.from(z, 'hex')).toString();
    
    res.json({ success: true, sharedSecret });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Message endpoint
app.post('/api/v1/message', async (req, res) => {
  const { recipientKnotId, ciphertext, senderKnotId } = req.body;
  if (!recipientKnotId || !ciphertext || !senderKnotId) {
    return res.status(400).json({ error: 'recipientKnotId, ciphertext, senderKnotId required' });
  }
  try {
    const result = await offlineQueueCollection.insertOne({
      recipient_knot_id: recipientKnotId,
      sender_knot_id: senderKnotId,
      ciphertext,
      created_at: new Date(),
      status: 'pending'
    });
    res.json({ success: true, messageId: result.insertedId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Test health check
setTimeout(() => {
  httpGet('http://localhost:' + PORT + '/health').then(result => {
    console.log('Health check result:', result);
    server.close();
    process.exit(0);
  }).catch(e => {
    console.error('Health check error:', e);
    server.close();
    process.exit(1);
  });
}, 1000);

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const http = require('http');
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}