# Appendices

## Glossary of Terms

| Term | Definition |
|------|------------|
| **Knot ID** | Unique identifier for a Knots user; either 12-word BIP39 mnemonic or 16-char base58 string derived from Ed25519 public key |
| **X3DH** | Extensible Messaging and Presence Designated Hierarchy; cryptographic key exchange protocol providing forward secrecy |
| **Double Ratchet** | Cryptographic protocol providing forward secrecy and post-compromise security; each message uses fresh key; used by Signal Protocol |
| **Ed25519** | Edwards-curve Digital Signature Algorithm; 255-bit key; RFC 8032; used for user identity signatures |
| **X25519** | X25519 key exchange; ECDH over Curve25519; used in X3DH and Double Ratchet |
| **BIP39** | Bitcoin Improvement Proposal 39; mnemonic sentence (12/24 words) for deterministic wallet key derivation |
| **Argon2id** | Memory-hard password hashing function; resistant to GPU/ASIC attacks; used for Knot ID hashing |
| **Triple Buffer** | Not related; this is not a term in this document |
| **Ably** | Cloud pub/sub service; WebSocket-based; used for real-time message distribution in Knots |
| **Dexie.js** | Lightweight IndexedDB wrapper for browser-based storage |
| **TTL (Time To Live)** | Database feature; automatic document deletion after specified time period |
| **Passphrase** | Optional user-provided password that derives additional encryption layer for stored keys |
| **PII** | Personally Identifiable Information; data that can identify individual (not collected in Knots) |
| **Forward Secrecy** | Property where compromise of long-term keys does not reveal past session keys |
| **Post-Compromise Security** | Property where system recovers from compromise after a limited number of messages |
| **Channel** | Ably's term for a pub/sub messaging path; private channels per contact pair in Knots |
| **Ratchet key chain** | Sequentially advanced key in Double Ratchet; each iteration derives new key from previous |
| **Re-key step** | DH exchange between sender's and recipient's current ratchet keys to derive new root key |
| **Media metadata** | Public information about a media file: size, mime type, dimensions; not encrypted in v1 |
| **EXIF data** | Image metadata containing camera settings, GPS location, timestamp; stripped before encryption |
| **Auto-blur** | Client-side face detection and Gaussian blur application before encryption/upload |

## References

- **Signal Protocol Specification**: https://github.com/signalapp/Spec
- **X3DH Key Exchange**: Trevor Perrin's original paper; RFC 6631
- **Double Ratchet Algorithm**: Signal Protocol details; Ratchet key derivation
- **Argon2id**: PHC competition winner; memory-hard function
- **Web Crypto API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- **libsodium.js**: https://github.com/jussi-karels/libsodium.js
- **@noble/curves**: https://github.com/paulmillr/noble-curves
- **@noble/hashes**: https://github.com/paulmillr/noble-hashes
- **BIP39**: https://github.com/bitcoin/bips/blob/master/bip-0039/bip-0039.mediawiki
- **Drizzle ORM**: https://orm.drizzle.team
- **Supabase**: https://supabase.com
- **MongoDB Atlas**: https://mongodb.com/atlas
- **Cloudflare R2**: https://cloudflare.com/r2
- **Ably**: https://ably.io
- **Biome**: https://biomejs.dev
- **Vitest**: https://vitest.dev
- **Playwright**: https://playwright.dev
- **OWASP Top 10**: https://owasp.org/www-project-top-ten
- **STRIDE threat modeling**: https://learn.microsoft.com/en-us/azure/security/fundamentals/threat-modeling-stride

## Package List

```json
// package.json (core dependencies)
{
  "name": "knots",
  "private": true,
  "scripts": {
    "dev": "bun dev",
    "build": "bun build",
    "test": "bun test",
    "test:e2e": "playwright test",
    "lint": "biome check --write .",
    "format": "biome format .",
    "lint:fix": "biome check --write .",
    "prepare": "husky generate"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.3.0",
    "@noble/curves": "^2.0.0",
    "@noble/hashes": "^2.0.0",
    "@supabase/ssr": "^0.3.0",
    "@supabase/supabase-js": "^2.39.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "dexie": "^4.0.0",
    "lucide-react": "^0.344.0",
    "next": "^14.2.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hot-toast": "^2.4.0",
    "zod": "^3.22.4",
    "zustand": "^4.5.0",
    "@tryably/sdk": "^2.5.0",
    "same-origin-isolation": "^1.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.42.0",
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "biome": "^1.5.0",
    "vitest": "^1.3.0",
    "typescript": "^5.3.0",
    "drizzle-orm": "^0.30.0",
    "drizzle-kit": "^0.20.0",
    "typescript-eslint": "^6.21.0"
  }
}
```

## Environment Variables Template

```env
# .env.example (never commit actual values)

# Application
NEXT_PUBLIC_APP_NAME="Knots"
NEXT_PUBLIC_APP_URL="http://localhost:5173"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" # backend only, never client

# MongoDB
MONGODB_URI="mongodb+srv://username:password@cluster0.mongodb.net"

# Ably
ABLY_API_KEY="your-ably-api-key"
ABLY_ENVIRONMENT="production|development"

# Cloudflare R2 / Backblaze B2
R2_ACCOUNT_ID="your-r2-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="knots-media"

# Sentry (optional)
SENTRY_DSN="https://yourkey@sentry.io/123"
NODE_ENV="development|production"

# Feature flags
FEATURE_DISAPPEARING_MESSAGES="true"
FEATURE_KEY_ROTATION="true"
FEATURE_CONTACT_BLOCKING="true"
```

## Useful Commands

```bash
# Development
bun dev                    # Start Next.js dev server with Bun
bun test                   # Run Vitest unit tests with coverage
bun test --run              # Run tests without watch mode
bun test:coverage          # Show coverage report
bun run lint               # Run Biome lint
bun run format             # Run Biome format fix
bun run build              # Build Next.js production build

# Database
npx supabase start          # Start local Supabase Docker
npx supabase db push        # Push migrations to local Supabase
npx supabase db reset       # Reset local Supabase database
mongosh "mongodb://localhost:27017"  # Connect to local MongoDB
mongosh "${MONGODB_URI}"     # Connect to Atlas MongoDB

# Deployment
vercel deploy               # Deploy to Vercel
bun run deploy              # Custom deploy script (if configured)

# Crypto utilities (one-offs)
bun -e "
import { generateEd25519KeyPair } from '@noble/curves';
const { privateKey, publicKey } = await generateEd25519KeyPair();
console.log('Ed25519 privateKey:', privateKey);
console.log('Ed25519 publicKey:', publicKey);
" 

# Generate keys in browser console
await window.crypto.subtle.generateKey(
  { name: 'Ed25519' },
  true,
  ['sign', 'verify']
)

// X3DH basic test (Node with @noble/curves)
bun -e "
import { generateX25519KeyPair } from '@noble/curves/x25519';
import { hkdf } from '@noble/hashes/sha256';

const { privateKey: alice_x25519 } = await generateX25519KeyPair();
const { privateKey: bob_x25519 } = await generateX25519KeyPair();

// Simplified: both generate same shared info for X3DH
console.log('X25519 keys generated successfully');
"
```