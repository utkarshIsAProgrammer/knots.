# System Architecture

## High-Level Diagram

```mermaid
graph TD
    subgraph Client [User Browser]
        A[React UI] -->|Web Crypto API| B[Encryption Layer]
        B -->|IndexedDB| C[Encrypted Local Storage]
        B -->|WebSocket| D[Ably Client]
        C -->|Decryption| A
        D -->|Receive ciphertext| A
        D -->|Publish ciphertext| A
    end

    subgraph Relay [Ably Free Tier]
        D -->|Publish/Subscribe| E[Ably Channels]
    end

    subgraph Backend [Render / Deno Deploy]
        F[Hono API] -->|Publish| E
        F -->|MongoDB Operations| G[MongoDB Atlas M0]
        F -->|Postgres Queries| H[Supabase PostgreSQL]
    end

    subgraph Storage [Cloudflare R2 / Backblaze B2]
        I[Encrypted Media] -->|Stored| J[R2 Bucket]
    end

    style Client fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style Backend fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style Relay fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style Storage fill:#f3e5f5,stroke:#8e24aa,stroke-width:2px
```

### Component Breakdown

| Component | Technology | Responsibilities |
|-----------|------------|------------------|
| **React UI** | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui | User interactions, routing, state management |
| **Web Crypto** | Web Crypto API, libsodium.js, @noble/curves | Key generation, X3DH, Double Ratchet, message encryption |
| **IndexedDB** | Dexie.js | Encrypted local storage of keys, messages, contact lists |
| **Ably Client** | Ably JS SDK | WebSocket pub/sub for real-time message distribution |
| **Hono API** | Hono (Bun runtime) | REST endpoints for registration, contact requests, key management |
| **Supabase PostgreSQL** | Postgres + Drizzle ORM | Hashed Knot IDs, contact request state, public keys, user metadata |
| **MongoDB Atlas M0** | MongoDB | Encrypted message blobs, offline queue with TTL auto-delete |
| **Cloudflare R2** | B2-compatible storage | Encrypted media files (images, voice notes) with v2-only access |
| **Sentry** | Free tier | Error tracking in production |
| **Biome** | Lint + format | TypeScript linting, prettier formatting |
| **Vitest** | Unit testing | Component tests, crypto test vectors, utility tests |
| **Playwright** | E2E testing | User flows: onboarding, messaging, contact flow, key rotation |

### Data Flow Diagrams

#### Registration Flow

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant C as React UI
    participant H as Hono API
    participant P as Supabase PG
    participant K as IndexedDB

    U->>C: Load app, generate keypair
    C->>K: Generate Ed25519 + X25519 keys
    C->>K: Derive Knot ID (base58 or BIP39)
    C->>H: POST /register {knot_id_hash, public_key}
    H->>P: Store hashed Knot ID + public key
    P-->>H: OK
    H-->>C: 200 OK, registration complete
    C->>U: Display Knot ID, warn: save securely
```

#### Contact Request Flow

```mermaid
sequenceDiagram
    participant A as User A
    participant A_UI as User A UI
    participant B as User B
    participant B_UI as User B UI
    participant H as Hono API
    participant P as Supabase PG
    participant M as MongoDB

    Note over A: User A enters User B's Knot ID
    A->>A_UI: Input B's Knot ID
    A_UI->>H: POST /contact-request {target_knot_id}
    H->>P: Validate hashed Knot ID exists
    P-->>H: OK / Not found
    H-->>A_UI: 200 Request sent / 404 Not found
    A_UI->>A: Show "Contact request sent"

    Note over B: User B receives notification
    B->>B_UI: Push notification via Ably
    B_UI->>H: POST /contact-request/accept {request_id}
    H->>P: Update contact status to 'accepted'
    P-->>H: OK
    H-->>B_UI: 200 Accepted
    B_UI->>B: Show "You are now connected"

    Note: After acceptance, A can send encrypted messages to B
```

#### Message Send Flow

```mermaid
sequenceDiagram
    participant S as Sender (User A)
    participant S_UI as User A UI
    participant R as Recipient (User B)
    participant R_UI as User B UI
    participant A as Ably
    participant H as Hono API
    participant M as MongoDB

    Note over S: Compose message, encrypt with recipient's X3DH session key
    S->>S_UI: Type message
    S_UI->>S: Encrypt via Double Ratchet (recipient's X3DH)
    S->>H: POST /messages {ciphertext, nonce}
    H->>A: Publish to private channel (A_B)
    A-->>H: 200 OK
    H-->>S_UI: 200 Message sent
    S_UI->>S: Show sent status

    Note over R: Recipient online?
    alt R online
        R->>R_UI: Ably delivers ciphertext via WebSocket
        R_UI->>R: Decrypt locally via Double Ratchet
        R->>R_UI: Display plaintext message
        R_UI->>R: Store in IndexedDB
    else R offline
        M->>M: Store ciphertext with TTL index (auto-delete after X days)
        M-->>R: Deliver on reconnect via polling / Ably presence
        R->>R_UI: Decrypt and display
    end
```

#### Key Rotation Flow

```mermaid
sequenceDiagram
    participant U as User
    participant U_UI as User UI
    participant H as Hono API
    participant P as Supabase PG
    participant K as IndexedDB

    Note over U: User initiates key rotation
    U->>U_UI: Click "Rotate keys"
    U_UI->>H: POST /keys/rotate {passphrase?}
    H->>P: Invalidate old keypair, store new Ed25519 + X25519
    P-->>H: OK
    H-->>U_UI: 200 New Knot ID generated
    U_UI->>K: Invalidate old keys, store new keys
    K-->>U_UI: Keys rotated
    U_UI->>U: Display new Knot ID; old one invalidated
    Note: All existing contacts must accept new Knot ID to resume messaging
```

### Sequence Diagrams (Critical Paths)

*See above data flow diagrams for complete sequence coverage.*