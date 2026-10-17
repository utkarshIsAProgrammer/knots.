# Project Plan

## Phase Breakdown (12 weeks for MVP)

| Phase | Weeks | Focus | Key Deliverables |
|-------|-------|-------|------------------|
| **Phase 0: Setup** | 1-2 | Project scaffolding, infrastructure, crypto foundations | Repo initialized; Bun + Next.js configured; Supabase + MongoDB Atlas; Ably account; CI/CD pipeline |
| **Phase 1: Core Crypto & Identity** | 3-4 | Key generation, Knot ID derivation, X3DH foundation, registration flow | Ed25519 + X25519 keypair generation; BIP39 mnemonic + base58 Knot ID; Server registration endpoint; Hashed Knot ID storage in Supabase |
| **Phase 2: Contact Flow** | 5-6 | Contact request send/accept/reject, blocking, session establishment | Contact request API; Contact acceptance flow; X3DH session establishment after acceptance; Blocking functionality |
| **Phase 3: Real-Time Messaging** | 7-8 | Ably integration, E2EE message send/receive, IndexedDB storage | Ably WebSocket client; Double Ratchet implementation; Message encryption/decryption; Local storage in IndexedDB; Offline queue |
| **Phase 4: Offline & Persistence** | 9 | MongoDB TTL queue, message auto-delete, disappearing messages | Offline message queue; MongoDB TTL indexes; 24h/7d/30d disappearing messages; Message status tracking |
| **Phase 5: Polish & Portfolio** | 10-12 | UI polishing, documentation, threat model, portfolio materials | PWA config; Threat model document; Architecture diagrams; SDLC document; Blog post; Sentry monitoring |

### Milestones & Deliverables per Phase

| Milestone | Phase | Completion Criteria |
|-----------|-------|---------------------|
| **M1: Repo & Infra** | 0 | Git repo with CI; Supabase project; MongoDB Atlas; Ably account; Docker dev stack |
| **M2: Key Gen & Knot ID** | 1 | User generates keys; Knot ID displayed (both base58 and BIP39); Registration works; Knot ID hashed stored |
| **M3: Contact Flow** | 2 | Send/receive contact requests; Accept/reject/block; After acceptance, message input enabled |
| **M4: E2EE Messaging** | 3 | Send encrypted message → receive and decrypt on other side; Ably transport verified; IndexedDB stores decrypted |
| **M5: Offline Delivery** | 4 | Send message when recipient offline → reconnect → message delivered from MongoDB TTL queue; Tested with browser close/reopen |
| **M6: Disappearing Messages** | 5 | Message with 24h TTL auto-deletes; Configurable TTL (24h/7d/30d); MongoDB TTL confirmed |
| **M7: MVP Complete** | 5+ | All core flows functional; No errors in critical paths; Documentation drafted |

### Risk Register with Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Render free tier spin-down** | High | Medium | Accept trade-off; handle graceful reconnection; document in onboarding |
| **MongoDB Atlas M0 limitations** | Medium | Medium | Stay within 512MB storage; monitor; upgrade if needed (still free tier eligible) |
| **Ably free tier message limit** | Medium | High | Optimize message size; batch when possible; monitor usage; upgrade path |
| **Web Crypto API compatibility** | Low | High | Test across browsers; provide fallbacks; use audited libraries |
| **IndexedDB persistence issues** | Low | Medium | Test across browser profiles; clear storage scenarios; warn users |
| **X3DH/Doubleratchet implementation bugs** | Medium | Critical | Implement against Signal Protocol spec; test with known-answer vectors; external review post-MVP |
| **Supabase RLS policy misconfiguration** | Low | High | Write tests for RLS; use service role key only in backend; review policies regularly |
| **R2 encryption leak** | Low | High | Server-side encryption before upload; client-side encryption primary; R2 just storage |
| **Scope creep** | High | High | Strict v1 non-goals; monthly scope review; document out-of-scope items |
| **Developer burnout (solo project)** | Medium | High | 20 hrs/week max; clear phase boundaries; take breaks; portfolio focus keeps motivation |

### Dependencies and Blockers

**Hard Dependencies** (must be resolved to proceed):

1. **Ably account** - Free tier sign-up; needed for real-time transport
2. **Supabase project** - PostgreSQL setup; needed for user data
3. **MongoDB Atlas M0** - NoSQL for offline queue; needed for offline delivery
4. **Cloudflare R2 / Backblaze B2** - Encrypted media storage; needed for v2 media
5. **Domain / HTTPS** - Custom domain optional; HTTPS required for production

**Soft Dependencies / Blockers**:

1. **External security review** - Recommended post-MVP; not blocking
2. **Browser compatibility testing** - Ongoing; not blocking initial development
3. **Dependency vulnerability discoveries** - Managed via Dependabot; not blocking

**Known Technical Blockers**:

- X3DH + Double Ratchet implementation against latest Signal spec
- Argon2id in browser (argon2-browser library availability, WASM fallback)
- Ably client vs server-side publishing permissions