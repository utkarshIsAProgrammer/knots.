# Database Design

## PostgreSQL Schema (DDL)

```sql
-- Supabase PostgreSQL schema

-- Enum types for contact status
CREATE TYPE contact_status AS ENUM ('pending', 'accepted', 'rejected', 'blocked');
CREATE TYPE message_status AS ENUM ('pending', 'delivered', 'read');
CREATE TYPE message_type AS ENUM ('text', 'image', 'voice_note');

-- Table: users (minimal data only)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knot_id_hash BYTEA NOT NULL,       -- Argon2id hash of Knot ID (32 bytes)
    x25519_public_key BYTEA NOT NULL,  -- X25519 public key for X3DH
    ed25519_public_key BYTEA NOT NULL, -- Ed25519 public key for signatures
    ed25519_private_key BYTEA,         -- Optional: only stored if passphrase-protected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE,
    is_online BOOLEAN DEFAULT FALSE,
    UNIQUE (knot_id_hash)
);

-- Indexes for user lookup by hashed Knot ID
CREATE INDEX idx_users_knot_hash ON users(knot_id_hash);
CREATE INDEX idx_users_online ON users(is_online);
CREATE INDEX idx_users_created ON users(created_at);

-- Table: contact_requests
CREATE TABLE contact_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status contact_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (sender_id, recipient_id)
);

-- Indexes for contact request lookups
CREATE INDEX idx_contact_sender ON contact_requests(sender_id);
CREATE INDEX idx_contact_recipient ON contact_requests(recipient_id);
CREATE INDEX idx_contact_status ON contact_requests(status);

-- Table: session_keys (X3DH session state)
CREATE TABLE session_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ratchet_key BYTEA NOT NULL,     -- Current root chain key
    chain_counter INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, partner_id)
);

-- Indexes for session key lookups
CREATE INDEX idx_session_user ON session_keys(user_id);
CREATE INDEX idx_session_partner ON session_keys(partner_id);

-- Table: message_metadata (lightweight tracking)
CREATE TABLE message_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ably_message_id VARCHAR(128),  -- Ably's internal message ID
    status message_status DEFAULT 'pending',
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_message_sender ON message_metadata(sender_id);
CREATE INDEX idx_message_recipient ON message_metadata(recipient_id);
CREATE INDEX idx_message_status ON message_metadata(status);
```

## MongoDB Document Schemas

```javascript
// MongoDB Atlas M0 schema for encrypted message blobs and offline queue

// Collection: message_blobs
// TTL Index: created_at + 30 days (for disappearing messages default)

{
  _id: ObjectId,
  message_id: String,             -- Unique message UUID
  sender_knot_id_hash: Buffer,  -- Hashed sender Knot ID (for revocation check)
  recipient_knot_id_hash: Buffer, -- Hashed recipient Knot ID
  session_key_id: String,        -- Reference to session_keys PG row
  ciphertext: String,             -- Base64-encrypted message (AES-GCM or XChaCha20-Poly1305)
  nonce: String,                  -- Base64 GCM nonce / XChaCha20 nonce
  message_type: String,           -- 'text', 'image', 'voice_note'
  media_metadata: {                -- Optional, if type === 'image' etc.
    original_filename: String,
    size_bytes: Number,
    r2_key: String,              -- Cloudflare R2 key reference
    exif_stripped: Boolean,
    width: Number,
    height: Number,
    mime_type: String
  },
  created_at: Date,               -- TTL indexed for auto-delete
  expires_at: Date,               -- Calculated: created_at + TTL (24h/7d/30d)
  delivery_status: String,        -- 'pending', 'delivered', 'expired'
  read_by_recipient: Boolean DEFAULT false,
  ratchet_sequence: Number,       -- Double Ratchet sequence number
}

// TTL Index: db.message_blobs.createIndex({ created_at: 1 }, { expireAfterSeconds: 0 })
-- Auto-deletes documents where created_at + TTL has passed

// Collection: offline_queue
// For recipients who are offline; delivered on reconnect

{
  _id: ObjectId,
  recipient_knot_id_hash: Buffer, -- Hashed Knot ID of offline user
  message_blob_id: ObjectId,       -- Ref to message_blobs _id
  delivered: Boolean DEFAULT false,
  attempts: Number DEFAULT 0,
  created_at: Date DEFAULT NOW(),
  delivered_at: Date
}

// Index for offline queue delivery
db.offline_queue.createIndex({ recipient_knot_id_hash: 1, delivered: 1 })
```

## Indexes and TTL Configuration

| Collection | Index | Purpose | TTL |
|------------|-------|---------|-----|
| `users` | `knot_id_hash` | Lookup user by hashed Knot ID | N/A |
| `users` | `is_online` | Track online status for presence | N/A |
| `contact_requests` | `(sender_id, recipient_id)` | Unique constraint on contact | N/A |
| `message_blobs` | `created_at` | Auto-delete after TTL | 30 days (default disappearing) |
| `offline_queue` | `(recipient_knot_id_hash, delivered)` | Find undelivered messages for offline user | N/A |
| `session_keys` | `(user_id, partner_id)` | Unique session per pair | N/A |

## Data Retention Policies

| Data Type | Retention | Reason |
|-----------|-----------|--------|
| **User profiles** | Indefinite, but can be deleted on key rotation | Minimal data; user can re-register with new Knot ID |
| **Contact requests** | 90 days after rejection/acceptance | Cleanup; old pending requests become stale |
| **Message blobs** | TTL via MongoDB index (30 days default) | Disappearing messages enforcement; even "persistent" messages auto-delete |
| **Offline queue entries** | 7 days from creation | If user offline > 7 days, messages expired; delivered or purged |
| **Session keys** | Until key rotation or user deletion | Rotated on key rotation event |
| **Ably channel messages** | Ably's free tier retention (~24h) | Not persisted server-side; rely on IndexedDB + MongoDB |
| **R2 media** | Until manually deleted or bucket policy | Encrypted media; referenced from MongoDB message_blobs |