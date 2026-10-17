# Requirements Specification

## Functional Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| **FR-1** | **Client-side keypair generation** | User's browser generates Ed25519 signing key and X25519 key pair via Web Crypto API on first load |
| **FR-2** | **Knot ID derivation** | Knot ID = 12-word BIP39 mnemonic OR 16-char base58 string derived from Ed25519 public key; user chooses at registration |
| **FR-3** | **Server registration** | User registers Knot ID (hashed via Argon2id) + public key to server; server stores only hashed ID and public key |
| **FR-4** | **Contact request flow** | User A sends contact request to User B's Knot ID; server forwards request; User B accepts/rejects/blocks; only after acceptance can messages flow |
| **FR-5** | **1:1 E2EE text chat via Ably** | After contact acceptance, users exchange messages through Ably WebSocket channels; ciphertext only, never plaintext on server |
| **FR-6** | **Local encrypted IndexedDB storage** | Encrypted message blobs stored in Dexie.js IndexedDB; decryption keys never persist to disk without passphrase protection |
| **FR-7** | **Offline message queue** | If recipient offline, message blob stored in MongoDB with TTL auto-delete; delivered on recipient reconnect |
| **FR-8** | **Key rotation** | User can generate new Ed25519 keypair + new Knot ID; old key invalidated; existing sessions terminated |
| **FR-9** | **Contact blocking** | User can block a contact; blocked contact cannot send messages; blocking is symmetric (both directions) |
| **FR-10** | **Disappearing messages** | Messages can be set to auto-delete after 24h, 7d, or 30d; enforced via MongoDB TTL index on delivery timestamp |
| **FR-11** | **Passphrase-protected key vault** | User can set a passphrase that derives additional encryption layer for stored keys in IndexedDB |
| **FR-12** | **PWA support** | Application installable; works offline for cached assets and last viewed chat state |
| **FR-13** | **Landing page with threat model** | Public landing page explaining privacy guarantees, threat model, and architecture |
| **FR-14** | **Landing page blog integration** | Blog post about launch; cross-posted to Hacker News, r/privacy, r/selfhosted |
| **FR-15** | **Sentry error monitoring** | Error tracking enabled in production; no user-identifying data sent to Sentry |

## Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| **NFR-1** | **Performance** | Time to first message < 3 seconds from app load (on broadband) |
| **NFR-2** | **Scalability** | Support 1,000-2,000 active users on free-tier services |
| **NFR-3** | **Reliability** | 99.9% availability; backend may spin down after 15 min inactivity (Render free tier acceptable) |
| **NFR-4** | **Security** | All cryptography implemented per Signal Protocol spec; no plaintext stored server-side; CSP v3.0 |
| **NFR-5** | **Usability** | Onboarding flow < 2 minutes; Knot ID display prominent; error messages user-friendly |
| **NFR-6** | **Privacy** | Zero PII collected; IP addresses never logged; Tor/Brave users not fingerprinted |
| **NFR-7** | **Responsiveness** | Mobile-first design; works on iPhone Safari, Android Chrome, desktop Chrome/Firefox |
| **NFR-8** | **Maintainability** | TypeScript strict mode; Biome lint/format; Vitest + Playwright test suite; Drizzle ORM for Postgres |
| **NFR-9** | **Free-tier compliance** | All services (Render, Deno Deploy, Ably free, Supabase, MongoDB Atlas M0, Cloudflare R2) do not require credit card |
| **NFR-10** | **Compliance** | OWASP Top 10 mitigations implemented; rate limiting on all endpoints; secret scanning; dependency scanning |

## Constraints & Assumptions

| Category | Detail |
|----------|--------|
| **Budget** | $0/month; all services must have free tier without credit card |
| **Development time** | 12 weeks for MVP (part-time: ~20 hrs/week) |
| **Deployment platform** | Render for backend (free tier, 15-min spin-down); Vercel/Netlify for frontend |
| **Runtime** | Bun for local development; Render/Deno Deploy for production |
| **Browser support** | Modern browsers supporting Web Crypto API, IndexedDB, ES modules |
| **Dependencies** | Minimize external deps; prefer audited cryptography libraries |
| **Assumptions** | Users have modern browsers; users understand security tradeoffs; threat model accepted |
| **Out of scope** | No email/SMS signup, no contact discovery, no social features, no voice/video, no multi-device sync |