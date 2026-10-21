/**
 * Knots Stealth Mode & Peer Shield (Approach A)
 *
 * Provides completely invisible feature gating for encrypted media (voice, image, video).
 * Zero UI footprint: No buttons, no modals, no settings menus exist for unpermitted users.
 */

const STORAGE_KEY_UNLOCKED = 'knots_stealth_unlocked';
const STORAGE_KEY_PEERS = 'knots_stealth_peers';
const STORAGE_KEY_CLOUDINARY = 'knots_cloudinary_cfg';

// Default master passcodes that activate Ghost Media Mode
const ACCEPTED_COMMANDS = new Set([
  '//ghost',
  '//omega',
  '//stealth',
  '//unlock',
  '//media'
]);

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

/**
 * Unlock Ghost Mode on this device
 */
export function setGhostUnlocked(unlocked: boolean): void {
  try {
    if (unlocked) {
      localStorage.setItem(STORAGE_KEY_UNLOCKED, '1');
    } else {
      localStorage.removeItem(STORAGE_KEY_UNLOCKED);
    }
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
 * Check if a peer is in your authorized media circle (Approach A)
 */
export function isPeerAuthorizedForMedia(peerKnotId?: string | null): boolean {
  if (!isGhostUnlocked()) return false;
  if (!peerKnotId) return false;
  const p = peerKnotId.toLowerCase().trim();
  const peers = getAuthorizedPeers();
  return peers.has(p);
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
 * Explicitly authorize a peer (e.g. when an encrypted media message arrives from them)
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

  // Fallback to environment variables if set at build time
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
 * Intercepts ghost commands typed into the message composer.
 * Returns true if the message was an in-app ghost command (do not send to chat).
 */
export function processGhostCommand(
  text: string,
  currentPeer?: string
): { isGhostCommand: boolean; feedback?: string } {
  const trimmed = text.trim();
  if (!trimmed.startsWith('//')) {
    return { isGhostCommand: false };
  }

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const arg1 = parts[1];
  const arg2 = parts[2];

  // 1. Lock command
  if (cmd === '//lock') {
    setGhostUnlocked(false);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([30, 50, 30]); } catch {}
    }
    return { isGhostCommand: true, feedback: 'locked' };
  }

  // 2. Unlock command (e.g. //ghost, //omega, //unlock, //unlock <code-or-preset>)
  if (ACCEPTED_COMMANDS.has(cmd)) {
    setGhostUnlocked(true);
    // If an authorized peer was passed or arg provided, authorize them
    if (arg1 && arg1.length > 3 && !arg2) {
      markPeerAuthorized(arg1);
    } else if (currentPeer) {
      markPeerAuthorized(currentPeer);
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(50); } catch {}
    }
    return { isGhostCommand: true, feedback: 'unlocked' };
  }

  // 3. Authorize peer in current chat (//allow or //peer)
  if (cmd === '//allow' || cmd === '//peer') {
    const targetPeer = arg1 || currentPeer;
    if (targetPeer) {
      const isNowAuth = togglePeerAuthorization(targetPeer);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(isNowAuth ? 40 : 20); } catch {}
      }
    }
    return { isGhostCommand: true };
  }

  // 4. Configure Cloudinary directly from chat (//cloud <cloudName> <unsignedPreset>)
  if (cmd === '//cloud' && arg1 && arg2) {
    saveCloudinaryConfig(arg1, arg2);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([20, 30, 20]); } catch {}
    }
    return { isGhostCommand: true, feedback: 'cloudinary_saved' };
  }

  return { isGhostCommand: false };
}
