// Typed client for the existing Knots relay (server/index.js).
// All app routes live under /api/v1 (proxied to http://localhost:3000 in dev).
// The relay is server-blind: only ciphertext and public data ever travel here.

import type {
  ContactRequest,
  HealthStatus,
  Identity,
  NetworkStats,
  NodeInfo
} from './types';

const STORAGE_KEY_RELAY = 'knots_custom_relay';

function loadBases(): string[] {
  const custom = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_RELAY) : null;
  const envBases = import.meta.env.VITE_API_BASE
    ? String(import.meta.env.VITE_API_BASE).split(',')
    : [];

  const combined = [
    ...(custom ? custom.split(',') : []),
    ...envBases
  ]
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);

  return combined.length > 0 ? combined : [''];
}

let RAW_BASES: string[] = loadBases();
let activeBaseIndex = 0;

export function setCustomRelay(url: string): void {
  const clean = url.trim().replace(/\/$/, '');
  if (typeof localStorage !== 'undefined') {
    if (clean) {
      localStorage.setItem(STORAGE_KEY_RELAY, clean);
    } else {
      localStorage.removeItem(STORAGE_KEY_RELAY);
    }
  }
  RAW_BASES = loadBases();
  activeBaseIndex = 0;
}

export function getRawBase(): string {
  return RAW_BASES[activeBaseIndex] || '';
}

export function rotateRawBase(): string {
  if (RAW_BASES.length > 1) {
    activeBaseIndex = (activeBaseIndex + 1) % RAW_BASES.length;
  }
  return getRawBase();
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let lastErr: any = null;
  const attempts = RAW_BASES.length;

  for (let i = 0; i < attempts; i++) {
    const idx = (activeBaseIndex + i) % attempts;
    const base = RAW_BASES[idx];
    const url = `${base}/api/v1${endpoint}`;

    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        throw new Error((data.error as string) || `Relay error (HTTP ${res.status})`);
      }
      activeBaseIndex = idx;
      return data as T;
    } catch (err: any) {
      lastErr = err;
    }
  }

  throw lastErr || new Error('All Knots relays unreachable');
}

export const api = {
  async health(): Promise<HealthStatus> {
    const attempts = RAW_BASES.length;
    let lastError = 'Relays offline';
    for (let i = 0; i < attempts; i++) {
      const idx = (activeBaseIndex + i) % attempts;
      const base = RAW_BASES[idx];
      try {
        const res = await fetch(`${base}/health`);
        if (res.ok) {
          activeBaseIndex = idx;
          return (await res.json()) as HealthStatus;
        }
      } catch (err: any) {
        lastError = err?.message || 'Relay offline';
      }
    }
    return { status: 'offline', error: lastError };
  },

  checkUsername(username: string) {
    return request<{ available: boolean; message?: string; error?: string }>(
      `/auth/check-username/${encodeURIComponent(username.trim().toLowerCase())}`
    );
  },

  registerWithUsername(data: {
    username: string;
    knotId: string;
    publicKey: string;
    x25519Key?: string;
    ed25519Key?: string;
    mnemonic?: string;
  }) {
    return request<{
      success: boolean;
      knotId: string;
      username: string;
      displayName: string;
      registered_at: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  loginWithUsername(data: { username: string; knotId: string }) {
    return request<{
      success: boolean;
      knotId: string;
      username: string;
      displayName: string;
      publicKey: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  register(identity: Identity) {
    return request<{ success: boolean; knotId: string; blind_id: string }>('/register', {
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

  listNodes() {
    return request<{ success: boolean; count: number; users: NodeInfo[] }>('/users');
  },

  getNode(knotId: string) {
    return request<NodeInfo & { success: boolean }>(`/user/${encodeURIComponent(knotId)}`);
  },

  sendContactRequest(fromKnotId: string, toKnotId: string, memo?: string) {
    return request<{ success: boolean; requestId: string; status: string }>('/contact-request', {
      method: 'POST',
      body: JSON.stringify({ fromKnotId, toKnotId, memo })
    });
  },

  getContactRequests(knotId: string) {
    return request<{ success: boolean; incoming: ContactRequest[]; outgoing: ContactRequest[] }>(
      `/contact-requests/${encodeURIComponent(knotId)}`
    );
  },

  respondContactRequest(requestId: string, action: 'accept' | 'reject' | 'block') {
    return request<{ success: boolean; status: string }>('/contact-request/respond', {
      method: 'POST',
      body: JSON.stringify({ requestId, action })
    });
  },

  x3dhHandshake(payload: {
    recipientPublicKey: string;
    senderIdentityKey: string;
    senderSignedPreKey?: string;
    senderOneTimeKey?: string;
  }) {
    return request<{ success: boolean; sharedSecret: string }>('/x3dh-handshake', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  sendMessage(payload: {
    id?: string;
    messageId?: string;
    recipientKnotId: string;
    senderKnotId: string;
    ciphertext: string;
    nonce?: string;
    tag?: string;
    chainCounter?: number;
    ttlSeconds?: number;
    replyTo?: unknown;
    type?: string;
    sticker?: string | null;
  }) {
    return request<{ success: boolean; messageId: string; expires_at: string; ttlSeconds: number }>(
      '/message',
      { method: 'POST', body: JSON.stringify(payload) }
    );
  },

  getMessages(knotId: string) {
    return request<{ success: boolean; count: number; messages: RawMessage[] }>(
      `/messages/${encodeURIComponent(knotId)}`
    );
  },

  markRead(messageId: string) {
    return request<{ success: boolean }>(`/messages/${encodeURIComponent(messageId)}/read`, {
      method: 'POST'
    });
  },

  markAllRead(recipientKnotId: string, senderKnotId: string) {
    return request<{ success: boolean }>('/messages/read-all', {
      method: 'POST',
      body: JSON.stringify({ recipientKnotId, senderKnotId })
    });
  },

  sentStatuses(senderKnotId: string) {
    return request<{ success: boolean; statuses: RawMessage[] }>(
      `/messages/sent-status/${encodeURIComponent(senderKnotId)}`
    );
  },

  editMessage(messageId: string, payload: { senderKnotId: string; ciphertext: string; nonce?: string; tag?: string }) {
    return request<{ success: boolean }>(`/messages/${encodeURIComponent(messageId)}/edit`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  deleteMessage(messageId: string, knotId: string, publicId?: string, mediaUrl?: string) {
    return request<{ success: boolean }>(`/messages/${encodeURIComponent(messageId)}`, {
      method: 'DELETE',
      body: JSON.stringify({ knotId, publicId, mediaUrl })
    });
  },

  deleteMedia(publicId: string, url?: string) {
    return request<{ success: boolean }>('/media/delete', {
      method: 'POST',
      body: JSON.stringify({ publicId, url })
    }).catch(() => ({ success: false }));
  },

  clearChat(userKnotId: string, peerKnotId: string) {
    return request<{ success: boolean }>('/messages/clear-chat', {
      method: 'POST',
      body: JSON.stringify({ userKnotId, peerKnotId })
    });
  },

  react(messageId: string, emoji: string, knotId: string) {
    return request<{ success: boolean }>(`/messages/${encodeURIComponent(messageId)}/react`, {
      method: 'POST',
      body: JSON.stringify({ emoji, knotId })
    });
  },

  presenceHeartbeat(knotId: string, typingTo?: string | null) {
    return request<{ success: boolean }>('/presence/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ knotId, typingTo: typingTo || null })
    });
  },

  async getPresence(knotId: string, peerId?: string) {
    return request<{ success: boolean; isOnline: boolean; lastSeen: number | null; isTyping: boolean }>(
      `/presence/${encodeURIComponent(knotId)}?peerId=${encodeURIComponent(peerId || '')}`
    );
  },

  async getBatchPresence(knotIds: string[], peerId?: string) {
    return request<{
      success: boolean;
      presences: Record<string, { isOnline: boolean; lastSeen: number | null; isTyping: boolean }>;
    }>('/presence/batch', {
      method: 'POST',
      body: JSON.stringify({ knotIds, peerId: peerId || null })
    });
  },

  rotateKeys(payload: { oldKnotId: string; newKnotId: string; newPublicKey: string; newEd25519Key?: string }) {
    return request<{ success: boolean; rotated: boolean; newKnotId: string }>('/keys/rotate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  purge(knotId: string) {
    return request<{ success: boolean; message: string }>(`/purge/${encodeURIComponent(knotId)}`, {
      method: 'DELETE'
    });
  },

  networkStats() {
    return request<NetworkStats & { success: boolean }>('/network/stats');
  }
};

/** Raw message as returned by the relay (mostly ciphertext + metadata). */
export interface RawMessage {
  _id: string;
  sender_knot_id: string;
  recipient_knot_id: string;
  ciphertext: string;
  nonce?: string | null;
  tag?: string | null;
  type?: string;
  sticker?: string | null;
  reply_to?: unknown;
  reactions?: { emoji: string; knotId: string }[];
  edited?: boolean;
  edited_at?: string;
  status?: string;
  created_at: string;
  expires_at?: string;
  ttlSeconds?: number;
}
