/**
 * Room key management for E2EE.
 * 
 * When a room is created, a random passphrase is generated and stored locally.
 * When sharing a room link, the passphrase is included in the URL fragment (#key=xxx).
 * The server never sees the key.
 */

const STORAGE_KEY = 'room_keys';

export function getRoomKeys(): Record<string, string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function getRoomKey(roomId: string): string | null {
  const keys = getRoomKeys();
  return keys[roomId] || null;
}

export function setRoomKey(roomId: string, key: string): void {
  const keys = getRoomKeys();
  keys[roomId] = key;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function generateRoomKey(): string {
  // Generate a random 16-char passphrase
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).replace(/[+/=]/g, '').slice(0, 16);
}

export function removeRoomKey(roomId: string): void {
  const keys = getRoomKeys();
  delete keys[roomId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}
