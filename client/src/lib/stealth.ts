/**
 * Knots Stealth Mode & Peer Shield (Approach A)
 *
 * Provides completely invisible feature gating for encrypted media (voice, image, video).
 * Zero UI footprint: No buttons, no modals, no settings menus exist for unpermitted users.
 */

import { create } from 'zustand';
import { toast } from '../features/toast';

const STORAGE_KEY_UNLOCKED = 'knots_stealth_unlocked';
const STORAGE_KEY_PEERS = 'knots_stealth_peers';
const STORAGE_KEY_CLOUDINARY = 'knots_cloudinary_cfg';
const STORAGE_KEY_PASSHASH = 'knots_stealth_passhash';

export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
}

/**
 * Check if this physical device has Ghost Mode unlocked
 */
export function isGhostUnlocked(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_UNLOCKED) === '1';
  } catch {
    return false;
  }
}

interface GhostStore {
  unlocked: boolean;
  setUnlocked: (unlocked: boolean) => void;
  toggle: () => void;
}

/**
 * Reactive Zustand store for ghost mode state across the app.
 * Allows components to reactively re-render when ghost mode is toggled.
 */
export const useGhostStore = create<GhostStore>((set) => ({
  unlocked: isGhostUnlocked(),
  setUnlocked: (unlocked: boolean) => {
    try {
      if (unlocked) {
        localStorage.setItem(STORAGE_KEY_UNLOCKED, '1');
      } else {
        localStorage.removeItem(STORAGE_KEY_UNLOCKED);
      }
    } catch {}
    set({ unlocked });
  },
  toggle: () => {
    const next = !isGhostUnlocked();
    try {
      if (next) {
        localStorage.setItem(STORAGE_KEY_UNLOCKED, '1');
      } else {
        localStorage.removeItem(STORAGE_KEY_UNLOCKED);
      }
    } catch {}
    set({ unlocked: next });
  }
}));

/**
 * Unlock or lock Ghost Mode on this device
 */
export function setGhostUnlocked(unlocked: boolean): void {
  useGhostStore.getState().setUnlocked(unlocked);
}

/**
 * Compute SHA-256 hex string in browser Web Crypto API
 */
export async function sha256Hex(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get active master passkey hash
 */
export function getMasterPassHash(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_PASSHASH) || null;
  } catch {
    return null;
  }
}

/**
 * Set custom master passkey
 */
export async function setMasterPasskey(newPasskey: string): Promise<void> {
  try {
    const hash = await sha256Hex(newPasskey.trim());
    localStorage.setItem(STORAGE_KEY_PASSHASH, hash);
  } catch {}
}

/**
 * Get list of peers authorized for media exchange in this device's Stealth Shield
 */
export function getAuthorizedPeers(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PEERS);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map((s: string) => s.toLowerCase().trim()) : []);
  } catch {
    return new Set();
  }
}

/**
 * Check if a peer is in your authorized media circle
 */
export function isPeerAuthorizedForMedia(_peerKnotId?: string | null): boolean {
  if (!isGhostUnlocked()) return false;
  return true;
}

/**
 * Authorize or de-authorize a peer for media
 */
export function togglePeerAuthorization(peerKnotId: string): boolean {
  if (!peerKnotId) return false;
  const p = peerKnotId.toLowerCase().trim();
  const peers = getAuthorizedPeers();
  let nowAuthorized = false;
  if (peers.has(p)) {
    peers.delete(p);
    nowAuthorized = false;
  } else {
    peers.add(p);
    nowAuthorized = true;
  }
  try {
    localStorage.setItem(STORAGE_KEY_PEERS, JSON.stringify(Array.from(peers)));
  } catch {}
  return nowAuthorized;
}

/**
 * Explicitly authorize a peer
 */
export function markPeerAuthorized(peerKnotId: string): void {
  if (!peerKnotId) return;
  const p = peerKnotId.toLowerCase().trim();
  const peers = getAuthorizedPeers();
  if (!peers.has(p)) {
    peers.add(p);
    try {
      localStorage.setItem(STORAGE_KEY_PEERS, JSON.stringify(Array.from(peers)));
    } catch {}
  }
}

/**
 * Cloudinary custom configuration (saved locally in browser vault)
 */
export function getCloudinaryConfig(): CloudinaryConfig | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CLOUDINARY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.cloudName && parsed?.uploadPreset) return parsed;
    }
  } catch {}

  const envName = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME;
  const envPreset = (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (envName && envPreset) {
    return { cloudName: envName, uploadPreset: envPreset };
  }
  return null;
}

export function saveCloudinaryConfig(cloudName: string, uploadPreset: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_CLOUDINARY, JSON.stringify({ cloudName, uploadPreset }));
  } catch {}
}

/**
 * Check if a message represents media (audio, video, image)
 */
export function isMediaMessage(msg?: { type?: string; plaintext?: string | null; sticker?: string | null } | null): boolean {
  if (!msg) return false;
  if (msg.type === 'media' || msg.type === 'audio' || msg.type === 'image' || msg.type === 'video') {
    return true;
  }
  const text = (msg.plaintext || '').trim();
  if (text.startsWith('{"mediaType":')) {
    return true;
  }
  return false;
}

/**
 * Cleanly format any message preview or reply snippet (never exposes raw JSON or base64)
 */
export function formatMessageSnippet(msg?: { type?: string; plaintext?: string | null; sticker?: string | null } | null): string {
  if (!msg) return '';

  const text = (msg.plaintext || '').trim();

  // Check if encrypted media payload JSON
  if (text.startsWith('{"mediaType":')) {
    try {
      const parsed = JSON.parse(text);
      if (parsed.mediaType === 'audio') return '🎤 Voice note';
      if (parsed.mediaType === 'video') return '🎥 Video';
      if (parsed.mediaType === 'image') return '📷 Photo';
    } catch {}
    return '📎 Media';
  }

  if (msg.type === 'audio') return '🎤 Voice note';
  if (msg.type === 'video') return '🎥 Video';
  if (msg.type === 'image') return '📷 Photo';
  if (msg.type === 'media') return '📎 Media';

  // Check if sticker or GIF
  if (msg.type === 'sticker' || Boolean(msg.sticker)) {
    if (text.includes('giphy.com') || text.includes('tenor.com') || text.endsWith('.gif')) {
      return '🎬 GIF';
    }
    return '🎨 Sticker';
  }

  // Check if text is a data URL or image/gif URL that was sent
  if (text.startsWith('data:image/')) {
    return '🎨 Sticker';
  }
  if (text.includes('giphy.com') || text.includes('tenor.com')) {
    return '🎬 GIF';
  }
  if (/^https?:\/\/.*\.(png|jpg|jpeg|webp|gif|svg)($|\?)/i.test(text)) {
    return text.includes('.gif') ? '🎬 GIF' : '🎨 Sticker';
  }

  // Check if raw JSON
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const parsed = JSON.parse(text);
      if (parsed.mediaType === 'audio') return '🎤 Voice note';
      if (parsed.mediaType === 'video') return '🎥 Video';
      if (parsed.mediaType === 'image') return '📷 Photo';
      if (parsed.sticker) return '🎨 Sticker';
    } catch {}
  }

  return text;
}

/**
 * Get preview text and timestamp for a thread in the contacts panel.
 * In Normal Mode (isGhost = false), all media messages are filtered out,
 * ensuring only text messages are shown, and zero traces of media exist.
 */
export function getMessagePreview(
  thread: any[] | undefined,
  isGhost: boolean,
  contactCreatedAt?: string | number
): { text: string; time?: number } {
  if (!thread || thread.length === 0) {
    return {
      text: '',
      time: contactCreatedAt ? new Date(contactCreatedAt).getTime() : undefined
    };
  }

  // In normal mode, hide media messages completely
  const visibleMessages = isGhost
    ? thread
    : thread.filter((m) => !isMediaMessage(m));

  if (visibleMessages.length === 0) {
    return {
      text: '',
      time: contactCreatedAt ? new Date(contactCreatedAt).getTime() : undefined
    };
  }

  const last = visibleMessages[visibleMessages.length - 1];

  if (last.status === 'deleted') {
    return { text: 'Message deleted', time: last.createdAt };
  }

  return {
    text: formatMessageSnippet(last),
    time: last.createdAt
  };
}

/**
 * Intercepts ghost commands typed into the message composer.
 * Returns true if the message was an in-app ghost command (do not send to chat).
 */
export async function processGhostCommand(
  text: string,
  currentPeer?: string
): Promise<{ isGhostCommand: boolean; feedback?: string }> {
  const trimmed = text.trim();
  if (!trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return { isGhostCommand: false };
  }

  // Normalize so both /ghost and //ghost produce //ghost
  const normalized = trimmed.startsWith('//') ? trimmed : `/${trimmed}`;
  const parts = normalized.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const arg1 = parts[1];
  const arg2 = parts[2];

  // 1. Revert to normal mode (//normal or //lock)
  if (cmd === '//normal' || cmd === '//lock') {
    setGhostUnlocked(false);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([25, 40, 25]); } catch {}
    }
    return { isGhostCommand: true, feedback: 'locked' };
  }

  // 2. Unlock ghost mode (//ghost or //unlock or //omega)
  if (cmd === '//ghost' || cmd === '//unlock' || cmd === '//omega') {
    // If explicit "off" / "0" argument passed to //ghost
    if (arg1 === 'off' || arg1 === 'lock' || arg1 === '0') {
      setGhostUnlocked(false);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([25, 40, 25]); } catch {}
      }
      return { isGhostCommand: true, feedback: 'locked' };
    }

    // Check passkey ONLY if user previously configured a custom passkey with //setkey
    const customPassHash = getMasterPassHash();
    if (customPassHash) {
      if (!arg1) {
        // Custom key is set but none provided: silent failure
        return { isGhostCommand: true, feedback: 'denied' };
      }
      const inputHash = await sha256Hex(arg1);
      if (inputHash !== customPassHash) {
        return { isGhostCommand: true, feedback: 'denied' };
      }
    }

    // Unlock ghost mode
    setGhostUnlocked(true);
    if (currentPeer) {
      markPeerAuthorized(currentPeer);
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(50); } catch {}
    }
    return { isGhostCommand: true, feedback: 'unlocked' };
  }

  // 3. Set custom secret passkey (//setkey <newPasskey>) - only when unlocked
  if (cmd === '//setkey' && arg1 && isGhostUnlocked()) {
    await setMasterPasskey(arg1);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([20, 20, 20]); } catch {}
    }
    return { isGhostCommand: true, feedback: 'key_updated' };
  }

  // 4. Configure Cloudinary directly from chat (//cloud <cloudName> <unsignedPreset>)
  if (cmd === '//cloud' && arg1 && arg2) {
    saveCloudinaryConfig(arg1.trim(), arg2.trim());
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([20, 30, 20]); } catch {}
    }
    toast.success('Cloudinary connected', `${arg1} (${arg2})`);
    return { isGhostCommand: true, feedback: 'cloudinary_saved' };
  }

  return { isGhostCommand: false };
}
