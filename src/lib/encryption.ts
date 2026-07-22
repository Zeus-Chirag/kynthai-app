// src/lib/encryption.ts
// Encryption utilities for medical documents
// Uses AES-256-GCM for authenticated encryption

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

// Get master key from environment (32 bytes = 256 bits)
const MASTER_KEY = process.env.ENCRYPTION_KEY || process.env.MASTER_ENCRYPTION_KEY;
if (!MASTER_KEY || MASTER_KEY.length < 32) {
  throw new Error('ENCRYPTION_KEY must be at least 32 characters');
}

const KEY = Buffer.from(MASTER_KEY.slice(0, 32), 'utf-8');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Derive a per-file encryption key from master key + file-specific salt
 */
export function deriveFileKey(salt: Buffer): Buffer {
  return scryptSync(KEY, salt, 32);
}

/**
 * Encrypt file buffer
 * Returns: { encryptedData, iv, salt, authTag }
 */
export function encryptFile(data: Buffer): {
  encryptedData: Buffer;
  iv: Buffer;
  salt: Buffer;
  authTag: Buffer;
} {
  const salt = randomBytes(SALT_LENGTH);
  const fileKey = deriveFileKey(salt);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, fileKey, iv);

  const encryptedData = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return { encryptedData, iv, salt, authTag };
}

/**
 * Decrypt file buffer
 */
export function decryptFile(
  encryptedData: Buffer,
  iv: Buffer,
  salt: Buffer,
  authTag: Buffer
): Buffer {
  const fileKey = deriveFileKey(salt);
  const decipher = createDecipheriv(ALGORITHM, fileKey, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
}

/**
 * Encrypt a string (for metadata, keys, etc.)
 */
export function encryptString(text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decrypt a string
 */
export function decryptString(encrypted: string): string {
  const [ivB64, tagB64, dataB64] = encrypted.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');

  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

/**
 * Encrypt a string with a specific key (for per-file keys)
 */
export function encryptWithKey(text: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decrypt a string with a specific key
 */
export function decryptWithKey(encrypted: string, key: Buffer): string {
  const [ivB64, tagB64, dataB64] = encrypted.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

/**
 * Generate a secure random file ID
 */
export function generateFileId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Sanitize filename for storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 255);
}

/**
 * Decrypt buffer with master key (for backwards compatibility)
 */
export function decrypt(buffer: Buffer): string {
  // Expects format: iv:authTag:encrypted (all base64)
  const parts = buffer.toString('base64').split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted format');
  
  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const encrypted = Buffer.from(parts[2], 'base64');
  
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

/**
 * Encrypt buffer with master key (for backwards compatibility)
 */
export function encrypt(buffer: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Encrypt a string value for database storage
 */
export function encryptValue(value: string): string {
  return encrypt(Buffer.from(value, 'utf8'));
}

/**
 * Decrypt a string value from database storage
 */
export function decryptValue(encrypted: string): string {
  try {
    const buffer = Buffer.from(encrypted, 'utf8');
    return decrypt(buffer);
  } catch {
    return '';
  }
}