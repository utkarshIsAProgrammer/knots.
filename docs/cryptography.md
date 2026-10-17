# Cryptography Design

## Key Types and Generation

| Key Type | Algorithm | Generation | Usage | Storage |
|----------|-----------|------------|-------|---------|
| **Ed25519 signing key** | Ed25519 (RFC 8032) | `crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])` | User identity signatures, contact request authentication | IndexedDB (encrypted via passphrase or raw Web Crypto key) |
| **Ed25519 public key** | Ed25519 | Derived from signing key | Verify signatures, sent to server during registration | IndexedDB + server (Supabase) |
| **X25519 key pair** | X25519 (ECDH) | `crypto.subtle.generateKey({ name: "X25519" }, true, ["deriveKey"])` | X3DH foundation, session key derivation | IndexedDB + server (Supabase) |
| **X3DH shared secret** | HKDF-SHA256 | Derived from X3DH components | Base for Double Ratchet initialization | Transient (not stored) |
| **Double Ratchet root key** | HKDF-SHA256 | Initialized from X3DH shared secret | Ratchet chain progression | IndexedDB (per-session) |
| **Message encryption key** | AES-GCM or XChaCha20-Poly1305 | Derived per-message via ratchet | Encrypt/decrypt message payload | Transient per message |
| **Passphrase-derived key** | Argon2id + HKDF | User-provided passphrase → 32-byte key | Optional additional encryption layer for stored keys | IndexedDB only; never sent to server |

## X3DH Handshake Flow

```mermaid
graph TB
    +----------------------+
    |  User A (Sender)     |
    +----------+-----------+
               |
   1. A's long-term keys:   Ed25519 signing, X25519 identity
   2. A's X25519 prekey pool: one-time keys consumed once
                |
                +--> X3DH Encryption
                |
    +----------+-----------+
    |  User B (Recipient)  |
    +----------+-----------+
   B's long-term keys:      Ed25519 identity, X25519 identity
   B's X25519 Signed Prekey: one-time, signed by B's Ed25519
   B's One-Time Prekeys:    pool, each used once
```

**X3DH Message Construction** (simplified):

| Component | Description |
|-----------|-------------|
| **Sender** constructs ciphertext message: `{ A_identity_key, A_x25519_prekey_id, A_x25519_prekey, B_x25519_signed_prekey_id, B_x25519_signed_prekey, ciphertext }` |
| **Receiver** reconstructs shared secret using:
  - B's X25519 identity key
  - B's X25519 Signed Prekey (verified against B's Ed25519 identity)
  - A's X25519 prekey (one-time)
  - A's Ed25519 identity key (verified against A's signature)
- Result: Z = KDF(identity_key_exchange + signed_prekey_exchange + one_prekey_exchange)
- Then: Double Ratchet root key = HKDF(Z, "Knots-DR-root", empty)

## Double Ratchet Implementation Details

| Component | Algorithm | Details |
|-----------|-----------|---------|
| **Ratchet key chain** | HKDF-SHA256 | Each iteration: `new_key = HKDF(root_key, "Knots-Ratchet", previous_key || chain_counter)` |
| **Message encryption** | AES-256-GCM (nonce = last 12 bytes of ratchet key) OR XChaCha20-Poly1305 (nonce = 24 random bytes) | Per-message key derived from current root key; ciphertext = `{ nonce, auth_tag, ciphertext }` |
| **Double Ratchet step** | After each send/receive: | 1. Ratchet: advance key chain<br>2. Re-key: derive new root key from DH exchange (ECDH between sender's and recipient's current ratchet keys)<br>3. Update chain counter |
| **Forward secrecy** | Each message uses fresh key; compromise of long-term keys only reveals messages after compromise point | Guaranteed by Double Ratchet re-key step |
| **Post-compromise security** | After compromised message, next message re-establishes security via ratchet advancement | Automatically via key chain progression |

## Key Storage and Rotation

```mermaid
graph LR
    K[IndexedDB Storage] -->|Encrypted via| P[Passphrase-derived Key]
    K -->|Raw Web Crypto| W[Web Crypto API]
    K -->|Transient| T[Session State (Double Ratchet)]

    style K fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style P fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style W fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style T fill:#f3e5f5,stroke:#8e24aa,stroke-width:2px
```

**Key Rotation Process**:

1. User clicks "Rotate Keys" in UI
2. (Optional) User provides passphrase if existing keys are passphrase-protected
3. Generate new Ed25519 + X25519 keypair via Web Crypto API
4. Derive new Knot ID (base58 or new BIP39 mnemonic)
5. User A sends contact rotation request to all contacts
6. Each contact accepts new Knot ID → old one invalidated
7. New Double Ratchet sessions established via X3DH with new keys
8. Old session keys deleted from IndexedDB after grace period
9. New Knot ID displayed prominently; old one shown as "inactive"

## Media Encryption (v2)

| Media Type | Encryption | Storage | Post-Processing |
|------------|-----------|---------|-----------------|
| **Images** | XChaCha20-Poly1305 (file-level) | Cloudflare R2 | EXIF stripping, auto-blur for sensitive content, dimension validation |
| **Voice notes** | AES-256-GCM (chunked) | Cloudflare R2 | Sample rate normalization, silence trimming, encryption before upload |
| **Video** | Not v1 (out of scope) | N/A | - |
| **Media metadata** | Not encrypted (public info: size, mime type, dimensions) | R2 metadata | No PII in metadata; strip GPS, camera model if privacy-sensitive |

**Media Flow**:

1. User selects file → Client-side encryption → Base64 → Upload to R2 via presigned URL
2. R2 stores encrypted blob; metadata stored in MongoDB `message_blobs.media_metadata`
3. On download: decrypt locally via Web Crypto API → Display
4. **EXIF stripping**: Canvas-based removal of metadata before encryption
5. **Auto-blur**: Client-side face detection (if available) → apply Gaussian blur → encrypt → upload