# Technology Stack — Knots.

> Complete technical architecture and specifications for the Knots sovereign, zero-knowledge anonymous messenger.

---

## 1. System Philosophy & Architecture

Knots operates under a strict **Zero-Knowledge, Server-Blind** paradigm:
- **Zero Plaintext on Network:** All cryptographic identities, session keys, and message ciphers are generated and sealed locally on the client before touching any network wire.
- **RAM-Only / Ephemeral Relayer:** The server acts as a blind router, inspecting zero plaintext payloads and holding zero persistent message histories once delivered.
- **Local-First Sovereign Storage:** All contacts, conversation histories, and identity shards reside exclusively within the user's browser-encrypted IndexedDB vault.

---

## 2. Frontend (Client-Side)

| Technology | Version / Spec | Purpose in Knots |
| :--- | :--- | :--- |
| **React** | `18.3.1` | Declarative component architecture powering real-time chat, profile drawers, burn badges, and modals. |
| **TypeScript** | `5.7.2` | Strict static typing for cryptographic key representations, raw ciphertext frames, and relay contracts. |
| **Vite** | `5.4.11` | High-speed build tool, HMR dev server with reverse-proxying, and ES2020 bundle optimization. |
| **Tailwind CSS** | `3.4.17` | Utility-first styling framework driving the Liquid Glass aesthetic and boxy precision design system. |
| **Framer Motion** | `11.15.0` | Physics-based micro-interactions, layout transitions, message bubble reactions, and drawer sheets. |
| **Zustand** | `5.0.2` | High-performance, lightweight state management separating identity, chat, contacts, presence, and UI concerns. |
| **Dexie.js** | `4.4.6` | Modern IndexedDB wrapper providing ACID local-first persistence for encrypted message vaults and identity state. |
| **Lucide React** | `0.468.0` | High-contrast, minimalist vector iconography for controls, security indicators, and status chips. |

---

## 3. Cryptography & Security Protocols

*All cryptographic primitives execute exclusively in client-side WebCrypto (`window.crypto.subtle`) without third-party cloud trust:*

| Primitive / Protocol | Specification | Role in Knots |
| :--- | :--- | :--- |
| **WebCrypto API** | W3C Standard | Hardware-accelerated browser cryptographic engine. Private keys never leave memory unencrypted. |
| **X25519 (Curve25519)** | RFC 7748 | Elliptic-Curve Diffie-Hellman (ECDH) key agreement for forward-secret session establishment. |
| **Ed25519** | RFC 8032 | Edwards-curve digital signatures powering sovereign Knots ID verification and safety numbers. |
| **Double Ratchet Protocol** | Signal Spec | Continuous per-message Diffie-Hellman and symmetric key ratcheting (Forward Secrecy + Break-in Recovery). |
| **AES-256-GCM** | NIST SP 800-38D | Authenticated encryption with associated data (AEAD) for all text, sticker, and media payloads. |
| **PBKDF2** | RFC 2898 | Key derivation with **100,000 SHA-256 rounds** stretching username + password into deterministic seed material. |
| **BIP-39** | Bitcoin Improvement Proposal | Standardized 12-word human-readable mnemonic seed phrase generation for identity recovery. |
| **X3DH** | Extended Triple DH | Asynchronous zero-knowledge cryptographic handshake enabling secure contact requests while offline. |
| **SHA-512 / SHA-256** | FIPS 180-4 | Blind identity hashing, contact query masking, and integrity verification. |

---

## 4. Backend & Ephemeral Relayer

| Technology | Version / Spec | Purpose in Knots |
| :--- | :--- | :--- |
| **Node.js** | `v20+` LTS | High-concurrency event-driven runtime environment. |
| **Express** | `5.3.0` | High-throughput server framework handling blind relay endpoints, contact handshakes, and SPA serving. |
| **Server-Sent Events (SSE)** | W3C EventSource | Real-time, zero-buffer unidirectional streaming protocol (`text/event-stream`) delivering instant encrypted packets without WebSocket frame overhead. |
| **MongoDB Atlas** | `v7.7.0` Driver | Persistent registry with TTL (Time-To-Live) auto-expire indexes for ephemeral offline message queues and unique handle validation. |
| **RAM In-Memory Store** | Ephemeral | In-process fallback store ensuring zero-dependency operation if external database connections are disabled. |
| **@supabase/supabase-js** | `2.118.0` | Optional shadow replication client for secondary key registry backup. |

---

## 5. DevOps, Containerization & Deployment

| Technology | Purpose |
| :--- | :--- |
| **Docker** | Multi-stage production container build (separating client TypeScript compilation from lightweight Alpine Linux runtime). |
| **Vercel** | Edge network deployment target for decoupled client SPA hosting. |
| **Render / Railway / VPS** | Production cloud targets for the Express relayer, SSE streams, and MongoDB database. |
