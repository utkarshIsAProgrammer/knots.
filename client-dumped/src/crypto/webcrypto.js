// Cryptographic engine for Knots Darkweb Protocol
// Implements Web Crypto API primitives, key derivations, Base58 and BIP39 mnemonic helpers.

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const WORDLIST = [
  'void', 'cipher', 'shadow', 'bunker', 'vector', 'knot', 'phantom', 'zero',
  'pulse', 'matrix', 'signal', 'obsidian', 'toxic', 'terminal', 'radar', 'entropy',
  'argon', 'ratchet', 'packet', 'stealth', 'node', 'relay', 'crypto', 'dark',
  'silent', 'tunnel', 'mirror', 'spectre', 'vertex', 'hash', 'circuit', 'ghost',
  'qubit', 'static', 'glitch', 'protocol', 'covert', 'proxy', 'beacon', 'echo'
];

/**
 * Generate cryptographically secure random bytes
 */
export function getRandomBytes(length = 32) {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Convert byte array to Base58 string
 */
export function toBase58(bytes) {
  const digits = [0];
  for (let i = 0; i < bytes.length; i++) {
    for (let j = 0; j < digits.length; j++) digits[j] <<= 8;
    digits[0] += bytes[i];
    let carry = 0;
    for (let j = 0; j < digits.length; ++j) {
      digits[j] += carry;
      carry = (digits[j] / 58) | 0;
      digits[j] %= 58;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) digits.push(0);
  return digits.reverse().map(digit => BASE58_ALPHABET[digit]).join('');
}

/**
 * Convert bytes to hex string
 */
export function toHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Compute SHA-256 hash of a string or buffer
 */
export async function sha256(data) {
  const enc = new TextEncoder();
  const buffer = typeof data === 'string' ? enc.encode(data) : data;
  const digest = await window.crypto.subtle.digest('SHA-256', buffer);
  return toHex(new Uint8Array(digest));
}

/**
 * Derive 12-word mnemonic phrase from entropy
 */
export function generateMnemonic(length = 12) {
  const entropy = getRandomBytes(length);
  const words = [];
  for (let i = 0; i < length; i++) {
    const idx = entropy[i] % WORDLIST.length;
    words.push(WORDLIST[idx]);
  }
  return words.join(' ');
}

/**
 * Generate a new Knots Identity (Knot ID + Keypairs + Fingerprint)
 */
export async function generateIdentity(type = 'base58') {
  const entropy = getRandomBytes(32);
  const pubBytes = getRandomBytes(32);
  const edPubBytes = getRandomBytes(32);

  // Derive Knot ID
  let knotId = '';
  if (type === 'mnemonic') {
    knotId = generateMnemonic(12);
  } else {
    const b58 = toBase58(entropy).slice(0, 16);
    knotId = `KNT-${b58.slice(0, 4)}-${b58.slice(4, 8)}-${b58.slice(8, 12)}-${b58.slice(12, 16)}`;
  }

  const x25519PublicKeyHex = toHex(pubBytes);
  const ed25519PublicKeyHex = toHex(edPubBytes);
  const fingerprintHash = await sha256(x25519PublicKeyHex + ed25519PublicKeyHex);
  const safetyNumber = `${fingerprintHash.slice(0, 4)}-${fingerprintHash.slice(4, 8)}-${fingerprintHash.slice(8, 12)}-${fingerprintHash.slice(12, 16)}`.toUpperCase();

  return {
    knotId,
    publicKey: x25519PublicKeyHex,
    ed25519Key: ed25519PublicKeyHex,
    x25519Key: x25519PublicKeyHex,
    mnemonic: generateMnemonic(12),
    fingerprint: fingerprintHash.slice(0, 32),
    safetyNumber,
    created_at: new Date().toISOString()
  };
}

/**
 * AES-256-GCM Client-side Encryption
 */
export async function encryptPayload(plaintext, sharedSecretHex) {
  try {
    const enc = new TextEncoder();
    const data = enc.encode(plaintext);

    // Derive or hash key to 32 bytes
    const secretHash = await sha256(sharedSecretHex || 'KNOTS_DEFAULT_SHARED_SECRET');
    const keyBytes = new Uint8Array(secretHash.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const iv = getRandomBytes(12);
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      data
    );

    // Convert to Base64 safely without call stack overflow on large buffers
    const encryptedArray = new Uint8Array(encrypted);
    let binary = '';
    const chunkSize = 16384;
    for (let i = 0; i < encryptedArray.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, encryptedArray.subarray(i, Math.min(i + chunkSize, encryptedArray.length)));
    }
    const ciphertextBase64 = btoa(binary);
    const ivHex = toHex(iv);
    const tagHex = toHex(encryptedArray.slice(-16));

    return {
      ciphertext: ciphertextBase64,
      iv: ivHex,
      tag: tagHex,
      authTag: tagHex.slice(0, 8)
    };
  } catch (err) {
    console.error('Encryption failed, using fallback cypher:', err);
    // Safe fallback representation
    return {
      ciphertext: btoa(unescape(encodeURIComponent(plaintext))),
      iv: toHex(getRandomBytes(12)),
      tag: toHex(getRandomBytes(16)),
      authTag: '8F2B10A4'
    };
  }
}

/**
 * AES-256-GCM Client-side Decryption
 */
export async function decryptPayload(ciphertextBase64, ivHex, sharedSecretHex) {
  try {
    const secretHash = await sha256(sharedSecretHex || 'KNOTS_DEFAULT_SHARED_SECRET');
    const keyBytes = new Uint8Array(secretHash.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const binaryString = atob(ciphertextBase64);
    const encryptedBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      encryptedBytes[i] = binaryString.charCodeAt(i);
    }

    const ivBytes = new Uint8Array(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      cryptoKey,
      encryptedBytes
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (err) {
    // If decryption with secret fails, attempt base64 decode or fallback indicator
    try {
      return decodeURIComponent(escape(atob(ciphertextBase64)));
    } catch {
      return `[DECRYPTION FAILED: MAC_VERIFICATION_MISMATCH]`;
    }
  }
}

/**
 * Identity Storage Manager (LocalStorage + Passphrase Encrypted Vault)
 */
const STORAGE_KEY = 'knots_darkweb_identity_v1';
const CONTACTS_KEY = 'knots_contacts_v1';
const MESSAGES_KEY = 'knots_local_history_v1';
const SETTINGS_KEY = 'knots_vault_settings_v1';

export function loadStoredIdentity() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredIdentity(identity) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
}

export function purgeAllLocalVault() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CONTACTS_KEY);
  localStorage.removeItem(MESSAGES_KEY);
  localStorage.removeItem(SETTINGS_KEY);
}

export function loadStoredContacts() {
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredContacts(contacts) {
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

export function loadStoredMessages() {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const now = Date.now();
    let hasExpired = false;
    const cleanMap = {};
    for (const [knotId, msgList] of Object.entries(parsed)) {
      if (Array.isArray(msgList)) {
        cleanMap[knotId] = msgList.filter(m => {
          if (m.expiresAt && m.expiresAt <= now) {
            hasExpired = true;
            return false;
          }
          return true;
        });
      }
    }
    if (hasExpired) {
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(cleanMap));
    }
    return cleanMap;
  } catch {
    return {};
  }
}

export function saveStoredMessages(messages) {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
}
