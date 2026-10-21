// Domain types for the Knots client. Mirrors the live relay contract in server/index.js.

export interface Identity {
  /** Public, human-shareable identifier, e.g. KNT-ABCD-EFGH-JKLM-NPQR */
  knotId: string;
  /** X25519 public key (hex) — registered with the relay */
  publicKey: string;
  x25519Key: string;
  /** Ed25519 public key (hex) — registered with the relay */
  ed25519Key: string;
  /** 12-word mnemonic phrase (human-readable identity back-up) */
  mnemonic: string;
  /** Short hash of the public keys */
  fingerprint: string;
  /** Grouped fingerprint for visual verification */
  safetyNumber: string;
  created_at: string;
}

export type ContactStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';

export interface Contact {
  knot_id: string;
  alias: string;
  status: ContactStatus;
  memo?: string;
  direction?: 'in' | 'out';
  muted?: boolean;
  created_at?: string;
  lastMessageAt?: number;
  unread?: number;
}

export interface ContactRequest {
  _id: string;
  from_knot_id: string;
  to_knot_id: string;
  memo?: string;
  status: ContactStatus;
  created_at?: string;
}

export type MessageType = 'text' | 'sticker' | 'media' | 'audio' | 'image' | 'video';

export interface Reaction {
  emoji: string;
  knotId: string;
}

export interface ReplyRef {
  id: string;
  text: string;
  sender: string;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  plaintext: string;
  ciphertext?: string;
  nonce?: string;
  tag?: string;
  type: MessageType;
  sticker?: string | null;
  replyTo?: ReplyRef | null;
  reactions: Reaction[];
  edited?: boolean;
  status: 'queued' | 'delivered' | 'read' | 'deleted';
  createdAt: number;
  expiresAt?: number | null;
  ttlSeconds?: number;
  pending?: boolean;
  failed?: boolean;
}

export interface NodeInfo {
  knot_id: string;
  public_key: string;
  ed25519_key?: string;
  registered_at?: string;
  last_seen_at?: string;
}

export interface Presence {
  isOnline: boolean;
  lastSeen: number | null;
  isTyping: boolean;
}

export interface NetworkStats {
  protocol: string;
  encryption: string;
  server_blind: boolean;
  nodes_active: number;
  queue_depth: number;
  entropy_source: string;
  uptime_sec: number;
  db_status: string;
}

export interface HealthStatus {
  status: string;
  server_blind?: boolean;
  mongo?: boolean;
  uptime_sec?: number;
  error?: string;
}

export type ThemeMode = 'dark' | 'light' | 'system';
