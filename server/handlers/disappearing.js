DisappearingMessages = {};

// Set TTL for a message (24h, 7d, 30d)
DisappearingMessages.setTTL = async (req, res) => {
  const { messageId, ttl } = req.body; // ttl: '24h' | '7d' | '30d'
  if (!messageId) {
    return res.status(400).json({ error: 'messageId required' });
  }
  const ttlMap = { '24h': 86400, '7d': 604800, '30d': 2592000 };
  const expireSeconds = ttlMap[ttl] || 86400;

  try {
    const { error } = await supabase
      .from('message_blobs')
      .update({ expires_at: supabase.rpc('add_seconds', { now: new Date(), seconds: expireSeconds }) })
      .eq('id', messageId);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true, ttl, expiresAt: new Date(Date.now() + expireSeconds * 1000) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Get disappearing message status
DisappearingMessages.getStatus = async (req, res) => {
  const { messageId } = req.query;
  if (!messageId) {
    return res.status(400).json({ error: 'messageId required' });
  }

  try {
    const { data, error } = await supabase
      .from('message_blobs')
      .select('*, expires_at')
      .eq('id', messageId)
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const now = new Date();
    const expired = now > new Date(data.expires_at);

    res.json({ success: true, ttl: data.expires_at, expired, createdAt: data.created_at });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = DisappearingMessages;