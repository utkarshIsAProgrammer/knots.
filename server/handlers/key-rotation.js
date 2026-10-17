KeyRotation = {};

// Rotate identity key (X3DH re-initiation)
KeyRotation.rotateIdentityKey = async (req, res) => {
  try {
    // Generate new Ed25519 + X25519 keypair
    const { x25519, randomBytes } = require('@stablelib/x25519');
    const newIdentityKey = randomBytes(32).toString('hex');
    const newSignedPreKey = randomBytes(32).toString('hex');

    // Update user in Supabase
    const { error } = await supabase
      .from('users')
      .update({ identity_key: newIdentityKey, signed_pre_key: newSignedPreKey })
      .eq('knot_id', req.knotId);

    if (error) return res.status(500).json({ error: error.message });

    // Invalidate all existing sessions/X3DH states
    // (In production, would also rotate one-time key pool)

    res.json({ success: true, newIdentityKey, reinitX3DH: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Rotate one-time keys (restock the pool)
KeyRotation.rotateOneTimeKeys = async (req, res) => {
  const { count } = req.body || { count: 10 };
  try {
    // Generate new one-time keys
    const { randomBytes } = require('@stablelib/random');
    const newOtkPool = [];
    for (let i = 0; i < count; i++) {
      newOtkPool.push(randomBytes(32).toString('hex'));
    }

    // Update user's one_time_key_pool
    const { error } = await supabase
      .from('users')
      .update({ one_time_key_pool: newOtkPool })
      .eq('knot_id', req.knotId);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true, newKeyCount: newOtkPool.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Get current key status
KeyRotation.getKeyStatus = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('identity_key, signed_pre_key, one_time_key_pool_status')
      .eq('knot_id', req.knotId)
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true, keyStatus: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = KeyRotation;