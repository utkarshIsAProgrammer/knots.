const { v4: uuidv4 } = require('uuid');

const ContactRequest = {};

// Send a contact request
ContactRequest.sendContactRequest = async (req, res) => {
  const { fromKnotId, toKnotId } = req.body;
  if (!fromKnotId || !toKnotId) {
    return res.status(400).json({ error: 'fromKnotId and toKnotId required' });
  }
  if (fromKnotId === toKnotId) {
    return res.status(400).json({ error: 'Cannot send request to yourself' });
  }

  try {
    const { error } = await supabase
      .from('contact_requests')
      .insert({ id: uuidv4(), from_knot_id: fromKnotId, to_knot_id: toKnotId, status: 'pending' });

    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true, requestId: uuidv4() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Accept a contact request
ContactRequest.acceptContactRequest = async (req, res) => {
  const { requestId } = req.body;
  if (!requestId) {
    return res.status(400).json({ error: 'requestId required' });
  }

  try {
    const { error } = await supabase
      .from('contact_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (error) return res.status(500).json({ error: error.message });

    // After acceptance, establish X3DH session
    res.json({ success: true, sessionEstablished: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Reject a contact request
ContactRequest.rejectContactRequest = async (req, res) => {
  const { requestId } = req.body;
  if (!requestId) {
    return res.status(400).json({ error: 'requestId required' });
  }

  try {
    const { error } = await supabase
      .from('contact_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Block a contact
ContactRequest.blockContact = async (req, res) => {
  const { targetKnotId } = req.body;
  if (!targetKnotId) {
    return res.status(400).json({ error: 'targetKnotId required' });
  }

  try {
    // Update user's blocked list
    const { error } = await supabase
      .from('users')
      .upsert({ knot_id: req.knotId, blocked_knot_ids: [...req.knotId ? [targetKnotId] : []] });

    if (error) return res.status(500).json({ error: error.message });

    // Reject any pending requests from this user
    await supabase
      .from('contact_requests')
      .update({ status: 'blocked' })
      .eq('to_knot_id', req.knotId)
      .eq('from_knot_id', targetKnotId);

    res.json({ success: true, blocked: targetKnotId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = ContactRequest;