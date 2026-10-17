const { x25519 } = require('@stablelib/x25519');
const { randomBytes } = require('@stablelib/random');
const { sha512 } = require('@stablelib/sha512');
const { createHMAC, createKDF } = require('@stablelib/hmac');
const { createHasher } = require('@stablelib/sha256');

// Double Ratchet state
class DoubleRatchetState {
  constructor(senderPrivateKey, recipientPublicKey) {
    this.senderPrivateKey = senderPrivateKey;
    this.recipientPublicKey = recipientPublicKey;
    
    // Ratchet chain
    this.chainKey = null;
    this.chainCounter = 0;
    
    // Sender chain
    this.senderChainKey = null;
    this.senderChainCounter = 0;
    
    // Initialize with X3DH shared secret
    this.initiate();
  }

  initiate() {
    // Derive initial chain key from X3DH shared secret
    // In production, this would use the actual X3DH shared secret
    const sharedSecret = this DeriveSharedSecret();
    this.chainKey = this.kdf(sharedSecret, 'chain-key');
    this.chainCounter = 0;
    
    // Initialize sender chain
    this.senderChainKey = this.kdf(sharedSecret, 'sender-chain-key');
    this.senderChainCounter = 0;
  }

  DeriveSharedSecret() {
    // X3DH: compute shared secret = x25519(sender.signed_prekey, recipient.identity_key)
    // simplified for demo
    const senderKey = x25519(this.senderPrivateKey, this.recipientPublicKey);
    return this.kdf(senderKey, 'shared-secret');
  }

  kdf(z, label) {
    // Key derivation function using HKDF-like approach
    return createHasher().update(Buffer.from(z, 'hex')).update(label).digest();
  }

  // Encrypt a message
  encrypt(message) {
    // Chain key advance (ratchet)
    this.chainKey = this.kdf(this.chainKey, 'chain-advance');
    this.chainCounter++;
    
    // Derive message key and IV
    const mk = this.kdf(this.chainKey, 'message-key');
    const iv = this.kdf(this.chainKey, 'iv');
    
    // AES-GCM encryption (simplified - using HMAC for demo)
    const messageBytes = Buffer.from(message, 'utf8');
    const hmac = createHMAC(mk, 'sha512');
    hmac.update(messageBytes);
    const tag = hmac.digest();
    
    return {
      ciphertext: messageBytes.toString('base64'),
      tag: tag.toString('base64'),
      chainCounter: this.chainCounter
    };
  }

  // Decrypt a message
  decrypt(ciphertext, tag) {
    // Chain key advance
    this.chainKey = this.kdf(this.chainKey, 'chain-advance');
    this.chainCounter++;
    
    // Derive message key and IV
    const mk = this.kdf(this.chainKey, 'message-key');
    
    // Verify HMAC and extract message
    const receivedTag = Buffer.from(tag, 'base64');
    const computedHmac = createHMAC(mk, 'sha512');
    computedHpc.update(Buffer.from(ciphertext, 'base64'));
    const expectedTag = computedHmac.digest();
    
    if (!this.constantTimeCompare(receivedTag, expectedTag)) {
      throw new Error('HMAC verification failed');
    }
    
    const messageBytes = Buffer.from(ciphertext, 'base64');
    return messageBytes.toString('utf8');
  }

  constantTimeCompare(a, b) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }
    return result === 0;
  }
}

module.exports = DoubleRatchetState;