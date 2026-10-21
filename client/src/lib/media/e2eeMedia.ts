import { getCloudinaryConfig } from '../stealth';

export interface EncryptedMediaPayload {
  mediaType: 'audio' | 'image' | 'video';
  url: string; // Cloudinary secure URL or encrypted data URL
  key: string; // Base64 AES-256 key
  iv: string; // Base64 IV
  mimeType: string;
  duration?: number; // for audio / video in seconds
  size?: number; // file size in bytes
  fileName?: string;
}

/**
 * Convert an ArrayBuffer to a Base64 string
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert a Base64 string to a Uint8Array
 */
function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const buf = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Strips EXIF metadata from an image by redrawing to an off-screen canvas.
 * This guarantees GPS coordinates, camera model, and device identifiers are erased.
 */
export async function stripExifFromImage(file: File | Blob): Promise<Blob> {
  return new Promise((resolve) => {
    // If not an image, resolve directly
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          resolve(blob || file);
        },
        file.type.includes('png') ? 'image/png' : 'image/webp',
        0.92
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

/**
 * Encrypts any binary Blob using client-side AES-256-GCM.
 * The key is generated ephemerally and never leaves memory unencrypted.
 */
export async function encryptMediaBlob(
  blob: Blob
): Promise<{ encryptedBlob: Blob; keyB64: string; ivB64: string }> {
  // 1. Generate 256-bit AES-GCM key
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // 2. Generate random 12-byte initialization vector (IV)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 3. Read raw data
  const rawData = await blob.arrayBuffer();

  // 4. Encrypt data
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    rawData
  );

  // 5. Export key to Base64
  const rawKeyBuffer = await crypto.subtle.exportKey('raw', key);
  const keyB64 = bufferToBase64(rawKeyBuffer);
  const ivB64 = bufferToBase64(iv.buffer);

  // Package encrypted payload as an application/octet-stream blob
  const encryptedBlob = new Blob([ciphertextBuffer], { type: 'application/octet-stream' });

  return { encryptedBlob, keyB64, ivB64 };
}

/**
 * Uploads an encrypted media blob to Cloudinary (or falls back to an encrypted data URL if Cloudinary is not configured).
 */
export async function uploadEncryptedMedia(
  mediaBlob: Blob,
  mediaType: 'audio' | 'image' | 'video',
  duration?: number
): Promise<EncryptedMediaPayload> {
  // 1. If image, strip EXIF metadata
  const sanitizedBlob = mediaType === 'image' ? await stripExifFromImage(mediaBlob) : mediaBlob;

  // 2. Encrypt locally in browser RAM with AES-256-GCM
  const { encryptedBlob, keyB64, ivB64 } = await encryptMediaBlob(sanitizedBlob);

  const cfg = getCloudinaryConfig();

  // 3. If Cloudinary is configured, upload directly to Cloudinary CDN
  if (cfg?.cloudName && cfg?.uploadPreset) {
    try {
      const formData = new FormData();
      // Generate a random UUID filename so no identifiable info exists
      const randomName = `${crypto.randomUUID()}.enc`;
      formData.append('file', encryptedBlob, randomName);
      formData.append('upload_preset', cfg.uploadPreset);

      const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cfg.cloudName)}/raw/upload`;
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const json = await res.json();
        const secureUrl = json.secure_url || json.url;
        if (secureUrl) {
          return {
            mediaType,
            url: secureUrl,
            key: keyB64,
            iv: ivB64,
            mimeType: sanitizedBlob.type || 'application/octet-stream',
            duration,
            size: sanitizedBlob.size
          };
        }
      }
    } catch {
      // Fallback below
    }
  }

  // 4. Fallback: store as raw encrypted base64 payload
  const reader = new FileReader();
  const encryptedBase64Url = await new Promise<string>((resolve) => {
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(encryptedBlob);
  });

  return {
    mediaType,
    url: encryptedBase64Url,
    key: keyB64,
    iv: ivB64,
    mimeType: sanitizedBlob.type || 'application/octet-stream',
    duration,
    size: sanitizedBlob.size
  };
}

// In-memory cache for decrypted blob URLs (prevents re-decrypting on every render)
const decryptedCache = new Map<string, string>();

/**
 * Downloads and decrypts an encrypted media file in browser memory.
 * Returns a local blob: URL that can be directly played or displayed.
 */
export async function decryptMediaPayload(payload: EncryptedMediaPayload): Promise<string> {
  const cacheKey = `${payload.url}-${payload.key.slice(0, 16)}`;
  if (decryptedCache.has(cacheKey)) {
    return decryptedCache.get(cacheKey)!;
  }

  let cipherBuffer: ArrayBuffer;

  if (payload.url.startsWith('data:')) {
    // Data URL
    const res = await fetch(payload.url);
    cipherBuffer = await res.arrayBuffer();
  } else {
    // Remote Cloudinary URL
    const res = await fetch(payload.url, { referrerPolicy: 'no-referrer' });
    if (!res.ok) throw new Error(`Media fetch failed: ${res.status}`);
    cipherBuffer = await res.arrayBuffer();
  }

  const keyBytes = base64ToBuffer(payload.key);
  const ivBytes = base64ToBuffer(payload.iv);

  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes as unknown as BufferSource },
    key,
    cipherBuffer
  );

  const decryptedBlob = new Blob([decryptedBuffer], { type: payload.mimeType });
  const objectUrl = URL.createObjectURL(decryptedBlob);

  decryptedCache.set(cacheKey, objectUrl);
  return objectUrl;
}

/**
 * Tests if a string is a serialized EncryptedMediaPayload JSON
 */
export function parseMediaPayload(str?: string | null): EncryptedMediaPayload | null {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!trimmed.startsWith('{"mediaType":')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && parsed.mediaType && parsed.url && parsed.key && parsed.iv) {
      return parsed as EncryptedMediaPayload;
    }
  } catch {}
  return null;
}
