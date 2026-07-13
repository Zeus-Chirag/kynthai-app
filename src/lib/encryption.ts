/**
 * AES-256-GCM encryption for sensitive data at rest.
 *
 * Used for: SSN, Tax ID, and other PII that must be
 * encrypted in the database but displayed in masked form.
 *
 * The ENCRYPTION_KEY must be exactly 32 bytes (256 bits).
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128-bit IV
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag
const ENCODING = 'base64';

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    // In development, derive a key from SESSION_SECRET as a fallback.
    // In production, ENCRYPTION_KEY MUST be set explicitly.
    const fallback = process.env.SESSION_SECRET;
    if (!fallback) {
      throw new Error(
        'CRITICAL: ENCRYPTION_KEY env var is not set. ' + 'Generate with: openssl rand -hex 32'
      );
    }
    // Derive a 32-byte key from the session secret using SHA-256.
    // SECURITY: This fallback is INSECURE in production — a derivable key
    // means anyone with SESSION_SECRET can decrypt all PHI at rest.
    // In production, ENCRYPTION_KEY (64 hex chars) MUST be set explicitly.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL: ENCRYPTION_KEY must be set in production. ' +
          'Deriving from SESSION_SECRET is not allowed.'
      );
    }
    cachedKey = crypto.createHash('sha256').update(fallback).digest();
    return cachedKey;
  }

  const key = Buffer.from(raw, 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)');
  }
  cachedKey = key;
  return key;
}

/**
 * Encrypt a plaintext string. Returns base64(iv + ciphertext + authTag).
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return '';

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', ENCODING);
  ciphertext += cipher.final(ENCODING);
  const authTag = cipher.getAuthTag();

  // Pack: iv (16 bytes) + authTag (16 bytes) + ciphertext
  return Buffer.concat([iv, authTag, Buffer.from(ciphertext, ENCODING)]).toString(ENCODING);
}

/**
 * Decrypt a base64(encoded iv + ciphertext + authTag) string.
 * Returns the original plaintext.
 */
export function decrypt(encrypted: string): string {
  if (!encrypted) return '';

  const key = getKey();
  const raw = Buffer.from(encrypted, ENCODING);

  if (raw.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Encrypted data is too short');
  }

  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(ciphertext, undefined, 'utf8');
  plaintext += decipher.final('utf8');
  return plaintext;
}

/**
 * Encrypt a value only if it's non-empty. Returns empty string for null/undefined.
 */
export function encryptValue(value: string | null | undefined): string | null {
  if (!value) return null;
  return encrypt(value);
}

/**
 * Decrypt a value only if it's non-empty. Returns null for empty input.
 */
export function decryptValue(encrypted: string | null | undefined): string | null {
  if (!encrypted) return null;
  try {
    return decrypt(encrypted);
  } catch {
    // Decryption failure means the data is corrupt or was encrypted with a different key.
    // Return null rather than throwing to avoid crashing read operations.
    return null;
  }
}

/**
 * Override the cached encryption key (used by key-rotation scripts).
 * Call BEFORE any encrypt/decrypt operations.
 */
export function setKey(keyHex: string): void {
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)');
  }
  (cachedKey as any) = key;
}

// ══ Binary buffer encryption (for file storage) ═══════════════════════════════
// These are used by src/lib/storage.ts to encrypt uploaded PHI documents.

const BUF_ALGO = 'aes-256-gcm';
const BUF_IV = 16;
const BUF_TAG = 16;

/**
 * Encrypt raw binary data with AES-256-GCM.
 * Returns: [ IV(16 bytes) | authTag(16 bytes) | ciphertext... ]
 */
export function encryptBuffer(buffer: Buffer): Buffer {
  if (!buffer || buffer.length === 0) return Buffer.alloc(0);
  const key = getKey();
  const iv = crypto.randomBytes(BUF_IV);
  const cipher = crypto.createCipheriv(BUF_ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]);
}

/**
 * Decrypt data produced by encryptBuffer.
 */
export function decryptBuffer(encrypted: Buffer): Buffer {
  if (!encrypted || encrypted.length < BUF_IV + BUF_TAG) {
    throw new Error('Encrypted buffer too short');
  }
  const key = getKey();
  const iv = encrypted.subarray(0, BUF_IV);
  const tag = encrypted.subarray(BUF_IV, BUF_IV + BUF_TAG);
  const ct = encrypted.subarray(BUF_IV + BUF_TAG);
  const decipher = crypto.createDecipheriv(BUF_ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}
