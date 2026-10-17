// API client for communicating with KNOTS Darkweb Relayer backend

const API_BASE = '/api/v1';

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  } catch (err) {
    // If relative fetch fails (e.g. dev server without proxy ready), try direct localhost:3000
    if (!endpoint.startsWith('http') && !endpoint.startsWith('http://localhost:3000')) {
      const fallbackUrl = `http://localhost:3000${url.startsWith('/api') ? url : `/api/v1${endpoint}`}`;
      try {
        const res = await fetch(fallbackUrl, {
          headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
          ...options
        });
        return await res.json();
      } catch {
        throw err;
      }
    }
    throw err;
  }
}

export const api = {
  // Health check
  async checkHealth() {
    try {
      const res = await fetch('/health').catch(() => fetch('http://localhost:3000/health'));
      return await res.json();
    } catch (err) {
      return { status: 'offline', error: err.message };
    }
  },

  // Register identity with the relayer
  async registerKnot(identity) {
    return request('/register', {
      method: 'POST',
      body: JSON.stringify({
        knotId: identity.knotId,
        publicKey: identity.publicKey,
        x25519Key: identity.x25519Key,
        ed25519Key: identity.ed25519Key,
        mnemonic: identity.mnemonic
      })
    });
  },

  // Discover registered peer nodes on the mesh
  async fetchNetworkNodes() {
    return request('/users');
  },

  // Get specific public profile
  async fetchKnotProfile(knotId) {
    return request(`/user/${encodeURIComponent(knotId)}`);
  },

  // Send contact handshake request
  async sendContactRequest(fromKnotId, toKnotId, memo) {
    return request('/contact-request', {
      method: 'POST',
      body: JSON.stringify({ fromKnotId, toKnotId, memo })
    });
  },

  // Get incoming & outgoing contact requests
  async fetchContactRequests(knotId) {
    return request(`/contact-requests/${encodeURIComponent(knotId)}`);
  },

  // Accept, reject, or block contact request
  async respondContactRequest(requestId, action) {
    return request('/contact-request/respond', {
      method: 'POST',
      body: JSON.stringify({ requestId, action })
    });
  },

  // X3DH Handshake shared key exchange
  async executeX3DHHandshake(data) {
    return request('/x3dh-handshake', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Send ciphertext message to recipient's offline queue
  async sendEncryptedMessage(data) {
    return request('/message', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Retrieve queued offline messages
  async fetchOfflineMessages(knotId) {
    return request(`/messages/${encodeURIComponent(knotId)}`);
  },

  // Acknowledge read / delivered message
  async ackMessage(messageId) {
    return request(`/messages/${encodeURIComponent(messageId)}/read`, {
      method: 'POST'
    });
  },

  // Mark all messages from a contact as read
  async markReadAll(recipientKnotId, senderKnotId) {
    return request('/messages/read-all', {
      method: 'POST',
      body: JSON.stringify({ recipientKnotId, senderKnotId })
    });
  },

  // Fetch read & reaction updates for messages sent by this knot
  async fetchSentStatuses(senderKnotId) {
    return request(`/messages/sent-status/${encodeURIComponent(senderKnotId)}`);
  },

  // Add emoji reaction to message
  async reactToMessage(messageId, emoji, knotId) {
    return request(`/messages/${encodeURIComponent(messageId)}/react`, {
      method: 'POST',
      body: JSON.stringify({ emoji, knotId })
    });
  },

  // Edit a message (only sender)
  async editMessage(messageId, data) {
    return request(`/messages/${encodeURIComponent(messageId)}/edit`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Delete message for everyone
  async deleteMessage(messageId, knotId) {
    return request(`/messages/${encodeURIComponent(messageId)}`, {
      method: 'DELETE',
      body: JSON.stringify({ knotId })
    });
  },

  // Instant clear chat history for conversation
  async clearChat(userKnotId, peerKnotId) {
    return request('/messages/clear-chat', {
      method: 'POST',
      body: JSON.stringify({ userKnotId, peerKnotId })
    });
  },

  // Presence and typing heartbeat
  async sendPresenceHeartbeat(knotId, typingTo) {
    return request('/presence/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ knotId, typingTo })
    });
  },

  // Get contact presence & typing status
  async getPresence(knotId, peerId) {
    return request(`/presence/${encodeURIComponent(knotId)}?peerId=${encodeURIComponent(peerId || '')}`);
  },

  // Rotate keypair and derive new Knot ID
  async rotateKeys(data) {
    return request('/keys/rotate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Panic button: wipe all server records for this knot
  async purgeKnot(knotId) {
    return request(`/purge/${encodeURIComponent(knotId)}`, {
      method: 'DELETE'
    });
  },

  // Network & radar statistics
  async fetchNetworkStats() {
    return request('/network/stats');
  }
};
