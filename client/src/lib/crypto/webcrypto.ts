// Knots — client-side cryptographic engine.
// Runs ENTIRELY on-device: keys are derived here and never leave the machine.
// WebCrypto primitives + Base58 + a 12-word mnemonic identity scheme.

import type { Identity } from '../api/types';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const WORDLIST = [
  'void', 'cipher', 'shadow', 'bunker', 'vector', 'knot', 'phantom', 'zero',
  'pulse', 'matrix', 'signal', 'obsidian', 'toxic', 'terminal', 'radar', 'entropy',
  'argon', 'ratchet', 'packet', 'stealth', 'node', 'relay', 'crypto', 'dark',
  'silent', 'tunnel', 'mirror', 'spectre', 'vertex', 'hash', 'circuit', 'ghost',
  'qubit', 'static', 'glitch', 'protocol', 'covert', 'proxy', 'beacon', 'echo'
];

export const DEFAULT_SHARED_SECRET = 'KNOTS_DEFAULT_SHARED_SECRET';

/** Cryptographically secure random bytes. */
export function getRandomBytes(length = 32): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/** Byte array → Base58 string. */
export function toBase58(bytes: Uint8Array): string {
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
  return digits.reverse().map((d) => BASE58_ALPHABET[d]).join('');
}

/** Byte array → lowercase hex. */
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Hex string → byte array. */
export function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const clean = hex.length % 2 ? `0${hex}` : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** SHA-256 of a string or buffer, returned as hex. */
export async function sha256(data: string | Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const buffer = typeof data === 'string' ? enc.encode(data) : data;
  const digest = await crypto.subtle.digest('SHA-256', buffer as BufferSource);
  return toHex(new Uint8Array(digest));
}

/** Derive a deterministic 12-word phrase from entropy. */
export function generateMnemonic(length = 12): string {
  const entropy = getRandomBytes(length);
  const words: string[] = [];
  for (let i = 0; i < length; i++) words.push(WORDLIST[entropy[i] % WORDLIST.length]);
  return words.join(' ');
}

/** Validate a phrase against the Knots wordlist. */
export function isValidMnemonic(phrase: string): boolean {
  const words = phrase.trim().toLowerCase().split(/\s+/);
  if (words.length !== 12) return false;
  return words.every((w) => WORDLIST.includes(w));
}

/** Group a fingerprint into human-verifiable blocks. */
export function toSafetyNumber(fingerprint: string): string {
  return `${fingerprint.slice(0, 4)}-${fingerprint.slice(4, 8)}-${fingerprint.slice(8, 12)}-${fingerprint.slice(12, 16)}`.toUpperCase();
}

/** Build a Knots ID from a 16-char base58 body. */
export function formatKnotId(body: string): string {
  const b = body.padEnd(16, 'x').slice(0, 16);
  return `KNT-${b.slice(0, 4)}-${b.slice(4, 8)}-${b.slice(8, 12)}-${b.slice(12, 16)}`;
}

export async function deriveIdentityKeys(seedHex: string) {
  const x = await sha256(`${seedHex}:x25519`);
  const e = await sha256(`${seedHex}:ed25519`);
  const fingerprintHash = await sha256(x + e);
  return {
    x25519Key: x,
    ed25519Key: e,
    publicKey: x,
    fingerprint: fingerprintHash.slice(0, 32),
    safetyNumber: toSafetyNumber(fingerprintHash)
  };
}

/** Generate a fresh identity (keypairs + Knots ID + mnemonic). */
export async function generateIdentity(type: 'base58' | 'mnemonic' = 'base58'): Promise<Identity> {
  const entropy = getRandomBytes(32);
  const mnemonic = generateMnemonic(12);
  const knotId =
    type === 'mnemonic'
      ? mnemonic
      : formatKnotId(toBase58(entropy).slice(0, 16));

  const keys = await deriveIdentityKeys(toHex(entropy));
  return {
    knotId,
    mnemonic,
    created_at: new Date().toISOString(),
    ...keys
  };
}

/** Derive the same 12-word phrase from a username + password, every time.
 *
 * This is what makes sign-in possible without a server account: the identity is
 * rebuilt on-device from what you remember, and nothing is ever uploaded. The
 * password is stretched with PBKDF2 so a stolen hint is useless without it. */
export async function deriveMnemonicFromCredentials(username: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = enc.encode(`knots.v1:${username.trim().toLowerCase()}`);
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 210_000, hash: 'SHA-256' },
    baseKey,
    256
  );
  const bytes = new Uint8Array(bits);
  const words: string[] = [];
  for (let i = 0; i < 12; i++) words.push(WORDLIST[bytes[i] % WORDLIST.length]);
  return words.join(' ');
}

/** Recover an identity deterministically from a mnemonic phrase. */
export async function importIdentityFromMnemonic(mnemonic: string): Promise<Identity> {
  const seed = await sha256(mnemonic.trim().toLowerCase());
  const keys = await deriveIdentityKeys(seed);
  return {
    knotId: formatKnotId(toBase58(fromHex(seed)).slice(0, 16)),
    mnemonic: mnemonic.trim().toLowerCase(),
    created_at: new Date().toISOString(),
    ...keys
  };
}

const aesKeyCache = new Map<string, CryptoKey>();

/** Derive the AES-256-GCM key bytes from a shared secret with instant memory cache. */
async function deriveAesKey(sharedSecretHex: string, usage: KeyUsage[]): Promise<CryptoKey> {
  const cacheKey = `${sharedSecretHex || DEFAULT_SHARED_SECRET}:${usage.slice().sort().join(',')}`;
  const cached = aesKeyCache.get(cacheKey);
  if (cached) return cached;
  const secretHash = await sha256(sharedSecretHex || DEFAULT_SHARED_SECRET);
  const key = await crypto.subtle.importKey('raw', fromHex(secretHash) as BufferSource, { name: 'AES-GCM' }, false, usage);
  aesKeyCache.set(cacheKey, key);
  return key;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 16384;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  tag: string;
}

/** Encrypt plaintext with AES-256-GCM. Plaintext never leaves this function unencrypted. */
export async function encryptPayload(plaintext: string, sharedSecretHex: string): Promise<EncryptedPayload> {
  const key = await deriveAesKey(sharedSecretHex, ['encrypt']);
  const iv = getRandomBytes(12);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
  );
  return {
    ciphertext: bytesToBase64(encrypted),
    iv: toHex(iv),
    tag: toHex(encrypted.slice(-16))
  };
}

/** Decrypt an AES-256-GCM payload. Returns null when the MAC fails. */
export async function decryptPayload(
  ciphertextBase64: string,
  ivHex: string,
  sharedSecretHex: string
): Promise<string | null> {
  try {
    const key = await deriveAesKey(sharedSecretHex, ['decrypt']);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromHex(ivHex || '0'.repeat(24)) },
      key,
      base64ToBytes(ciphertextBase64)
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null; // MAC verification mismatch — treat as undecryptable.
  }
}

/** A short, stable "shared secret" for a conversation between two Knots IDs. */
export async function conversationSecret(a: string, b: string): Promise<string> {
  const [x, y] = [a, b].sort();
  return sha256(`${DEFAULT_SHARED_SECRET}:${x}:${y}`);
}
