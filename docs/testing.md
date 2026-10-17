# Testing Strategy

## Test Pyramid

| Level | Framework | Scope | Target Coverage |
|-------|-----------|-------|-----------------|
| **Unit** | Vitest | Individual functions, crypto utilities, validation | 80%+ statements |
| **Integration** | Vitest + Testing Library | Component interactions, store integrations, API client | 70%+ scenarios |
| **E2E** | Playwright | Complete user flows: onboarding → messaging → key rotation | Critical paths 100% |
| **Property-based** | FastCheck (via Vitest) | Crypto invariants, ratchet state consistency | 50%+ properties |

### Unit Tests

**Crypto Test Vectors** (must-pass):

| Test | Description | Expected |
|------|-------------|----------|
| **X3DH key agreement** | Given sender/receiver long-term + one-time keys, derive shared secret | Same secret on both sides (deterministic) |
| **Double Ratchet re-key** | After n messages, root key advances via DH | New key differs from previous; forward secrecy holds |
| **Message encryption/decryption** | Encrypt then decrypt with current ratchet key | Plaintext round-trips exactly; auth_tag rejects tampered ciphertext |
| **Passphrase hashing** | Argon2id with parameters (m=16384, t=2, p=2) | Derived key length 32 bytes; time/memory within bounds |
| **Knot ID encoding** | BIP39 mnemonic → base58 public key derivation | Both produce valid Ed25519-derived IDs; 12-word mnemonic valid |

**Sample Unit Test**:

```typescript
// src/__tests__/crypto.test.ts
import { describe, it, expect } from 'vitest'
import { generateEd25519KeyPair, generateX25519KeyPair } from '@noble/curves'
import { hkdf, xor } from '@noble/hashes'
import { xor as xorFunc } from 'uint8arrays'

describe('X3DH Session Establishment', () => {
  it('should derive same shared secret between two parties', async () => {
    // Generate keys
    const { privateKey: a_ed25519, publicKey: a_ed25519_pub } = 
      await generateEd25519KeyPair()
    const { privateKey: a_x25519, publicKey: a_x25519_pub } = 
      await generateX25519KeyPair()
    
    // Same for party B
    const { privateKey: b_ed25519, publicKey: b_ed25519_pub } = 
      await generateEd25519KeyPair()
    const { privateKey: b_x25519, publicKey: b_x25519_pub } = 
      await generateX25519KeyPair()
    
    // Implement X3DH key agreement here...
    // (simplified: verify both derive same Z value)
    
    // Placeholder assertion
    expect(true).toBe(true) // TODO: implement full X3DH test
  })
})
```

### Integration Tests

**Key Flows**:

1. **Onboarding flow**: Generate keys → register Knot ID → display Knot ID → user saves it
2. **Contact request flow**: Send request → other user accepts → messages become sendable
3. **Message send/receive**: Compose → encrypt → send via Ably → receive → decrypt → display
4. **Key rotation**: Rotate keys → invalidate old → new sessions work

**Sample Integration Test** (Playwright):

```javascript
// playwright/tests/onboarding.test.ts
import { test, expect } from '@playwright/test'

test('user can complete onboarding and send first message', async ({ page }) => {
  // 1. Navigate to app
  await page.goto('/')
  
  // 2. Generate keys
  await page.click('#generate-keys-btn')
  await expect(page.locator('.knot-id')).toBeVisible()
  
  // 3. User copies Knot ID (simulated)
  await page.click('#copy-knot-id-btn')
  
  // 4. Register with server (mocked)
  await page.evaluate(() => {
    // Registration happens via API; mock the response
  })
  
  // 5. Wait for onboarding complete
  await expect(page.locator('#chat-view')).toBeVisible()
  
  // 6. Simulate second user (via test fixture or separate browser)
  // 7. Send message from user A to user B
  // 8. Verify message appears decrypted on user B
})
```

### E2E Tests (Playwright)

**Critical Paths**:

| Path | Steps | Success Criteria |
|------|-------|------------------|
| **Onboarding** | Load app → generate keys → register → save Knot ID → view chat | Knot ID displayed; no errors |
| **Contact flow** | User A sends request → User B accepts → A can send messages → B receives | Mutual contact status = accepted |
| **E2EE messaging** | Compose text → encrypt → send → receive on other side → decrypt displays correct text | Plaintext matches; ciphertext never exposed |
| **Offline delivery** | Send message when recipient offline → come back online → message delivered from MongoDB | Message delivered after reconnect; TTL respected |
| **Key rotation** | Rotate keys → contacts must re-accept → new sessions established | Old Knot ID invalidated; messaging works with new ID |
| **Disappearing messages** | Send message with 24h TTL → after 24h (or mock time) → message auto-deleted from MongoDB | Message blob removed; not visible in IndexedDB |

### Crypto Test Vectors (Detailed)

**X3DH Test Vectors** (RFC 6631 style):

```
Alice's long-term keys:
  - Ed25519 identity key:     d25a3... (private)
  - Ed25519 identity pub:       D25a3... (public)
  - X25519 identity key:      d35a3... (private)
  - X25519 identity pub:      D35a3... (public)
```