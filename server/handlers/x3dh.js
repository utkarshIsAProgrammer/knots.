const { x25519 } = require('@stablelib/x25519');
const { randomBytes } = require('@stablelib/random');
const { sha512 } = require('@stablelib/sha512');
const DoubleRatchet = require('../crypto/doubleratchet');

async function initiateX3DH(req, res) {
  const { recipientPublicKey, senderIdentityKey, senderSignedPreKey, senderOneTimeKey } = req.body;
  const senderKnotId = req.knotId;

  // X3DH: compute shared secret
  // Step 1: Compute Z = x25519(sender_signed_prekey, recipient_identity_key)
  const z = x25519(senderSignedPreKey, recipientPublicKey);

  // Step 2: Compute shared secret from Z
  // In full X3DH, we also incorporate recipient's one-time key
  const sharedSecret = sha512(Buffer.from(z, 'hex')).toString();

  // Step 3: Initialize Double Ratchet state
  const ratchet = new DoubleRatchet(senderIdentityKey, recipientPublicKey);

  // Store ratchet state (in production, use Redis or DB)
  res.json({
    success: true,
    sharedSecret,
    ratchetState: {
      chainCounter: ratchet.chainCounter,
      // Don't send actual keys, just confirm init
    }
  });
}

function handleX3DHResponse(req, res) {
  const { recipientKnotId, ciphertext } = req.body;
  const senderKnotId = req.knotId;

  // Retrieve ratchet state and decrypt
  // In production, this would be fetched from storage
  res.json({
    success: true,
    plaintext: 'decrypted message placeholder'
  });
}

module.exports = { initiateX3DH, handleX3DHResponse };