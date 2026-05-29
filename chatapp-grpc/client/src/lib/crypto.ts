/**
 * End-to-End Encryption using AES-GCM with Web Crypto API.
 * 
 * Each room has a shared key derived from the room's invite code / passphrase.
 * Messages are encrypted client-side before sending and decrypted on receive.
 * The server only stores ciphertext.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

// Derive an AES key from a passphrase (room key)
async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('grpc-chat-e2ee-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

// Cache derived keys to avoid re-deriving on every message
const keyCache = new Map<string, CryptoKey>();

async function getKey(roomPassphrase: string): Promise<CryptoKey> {
  if (keyCache.has(roomPassphrase)) {
    return keyCache.get(roomPassphrase)!;
  }
  const key = await deriveKey(roomPassphrase);
  keyCache.set(roomPassphrase, key);
  return key;
}

/**
 * Encrypt a plaintext message.
 * Returns a base64-encoded string containing IV + ciphertext.
 */
export async function encryptMessage(
  plaintext: string,
  roomPassphrase: string
): Promise<string> {
  const key = await getKey(roomPassphrase);
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(plaintext)
  );

  // Combine IV + ciphertext into a single buffer
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Encode as base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a message.
 * Input is the base64-encoded string from encryptMessage.
 */
export async function decryptMessage(
  encryptedBase64: string,
  roomPassphrase: string
): Promise<string> {
  try {
    const key = await getKey(roomPassphrase);
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

    // Extract IV (first 12 bytes) and ciphertext (rest)
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const plaintext = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(plaintext);
  } catch {
    // If decryption fails (wrong key, corrupted data), return placeholder
    return '🔒 [encrypted message - wrong key]';
  }
}

/**
 * Check if a message looks encrypted (base64 encoded, starts with expected pattern)
 */
export function isEncrypted(content: string): boolean {
  // Encrypted messages are base64 and longer than typical text
  if (content.length < 20) return false;
  try {
    atob(content);
    // If it decodes without error and has no spaces, likely encrypted
    return !content.includes(' ') && /^[A-Za-z0-9+/=]+$/.test(content);
  } catch {
    return false;
  }
}
