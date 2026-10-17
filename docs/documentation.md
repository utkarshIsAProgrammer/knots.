# Documentation Plan

## README Structure

```markdown
# Knots

## Overview
Server-blind, end-to-end encrypted anonymous chat application.

## Quick Start
1. `bun install`
2. `bun run dev`
3. Generate keys; save your Knot ID
4. Share Knot ID with contacts

## Features
- Phase 1: Keypairs, Knot IDs, contact flow, E2EE chat
- Phase 2: Disappearing messages, key rotation, blocking
- Phase 3: PWA, threat model, landing page

## Architecture
- Diagram: see SDLC document
- Crypto: X3DH + Double Ratchet
- Storage: IndexedDB + MongoDB TTL + Ably

## Security
- Threat model: see docs/
- CSP headers: see config/
- No PII stored

## License
MIT (or specify)
```

### Threat Model Document

**File**: `docs/threat-model.md`

Contents include:
- Attacker capabilities assumed
- Trust boundaries (client vs server vs network)
- Data flow diagram with trust zones
- Mitigations per threat
- Known limitations (traffic analysis, compromised device)
- User security advice section

### Architecture Decision Records (ADRs)

| ADR ID | Title | Decision | Context | Status |
|--------|-------|----------|---------|--------|
| ADR-001 | Use X3DH + Double Ratchet | Signal Protocol v3 | Need forward secrecy, E2EE; no custom crypto | Accepted |
| ADR-002 | Argon2id for Knot ID hashing | Computationally expensive but resistant to GPU attacks | Must protect against rainbow tables; browser-compatible | Accepted |
| ADR-003 | MongoDB TTL for offline queue | No persistent WebSocket server needed | Render free tier can't sustain always-on WS; TTL acceptable trade-off | Accepted |
| ADR-004 | Ably for pub/sub | Free tier sufficient for 1K-2K users; no card required | Must avoid services requiring credit card | Accepted |
| ADR-005 | No account recovery | Lost key = lost access | Aligns with anonymity goals; user responsibility | Accepted |
| ADR-006 | IndexedDB over LocalStorage | Larger capacity; better encryption support; modern browser API | LocalStorage too small (5MB); IndexedDB scales better | Accepted |
| ADR-007 | Base58 Knot ID alternative | 16-char base58 derived from public key | Alternative to BIP39 mnemonic for users who don't want seed words | Accepted |

**ADR Template**:

```markdown
## ADR-001: Use X3DH + Double Ratchet for Key Exchange

### Context
Knots requires forward-secret E2EE text chat. Threat model assumes malicious server operator.

### Decision
Implement X3DH handshake followed by Double Ratchet protocol (Signal Protocol v3).

### Alternatives Considered
- **Simple RSA key exchange**: No forward secrecy; compromise of long-term key reveals all past messages
- **Off-the-Record (OTR) protocol**: Not web-compatible; complex handshake over HTTP
- **OMEMO**: Works but more complex multi-device; out of scope for v1

### Consequences
- ✅ Forward secrecy guaranteed
- ✅ Post-compromise security via ratchet advancement
- ❌ Requires X3DH component management (prekeys, signed prekeys)
- ❌ Slightly higher CPU cost on mobile browsers (negligible for chat use case)

### Status
Accepted - implemented in Phase 1
```

### Blog Post Outline

**Title**: "Knots: Building a Server-Blind, End-to-End Encrypted Anonymous Chat"

**Sections**:
1. Problem statement: why another chat app?
2. Threat model: what we're protecting against
3. Architecture overview: server-blind design
4. Cryptography: X3DH + Double Ratchet explained simply
5. Free-tier choices: running without a credit card
6. Challenges faced: Render spin-down, MongoDB TTL, Ably limits
7. Future roadmap: group chat, media, onion routing
8. Call to action: try it, give feedback, respect privacy

**Target Publications**: Hacker News, r/privacy, r/selfhosted, Lobsters