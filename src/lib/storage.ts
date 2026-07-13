/**
 * HIPAA-COMPLIANT ENCRYPTED FILE STORAGE
 *
 * Provides AES-256-GCM encrypted file storage for PHI documents:
 * - Medical records (PDF lab results, radiology images)
 * - Prescription PDFs and images
 * - Verification documents (doctor license, lab accreditation)
 * - Patient-uploaded health documents
 *
 * Properties:
 * - All file bytes are encrypted BEFORE writing to disk.
 * - IV (16 bytes) + Auth Tag (16 bytes) are prepended to ciphertext.
 * - No plaintext file is ever persisted to disk.
 * - File access requires an opaque fileToken — no public URLs.
 * - Owner-only filesystem permissions (0o600) on all stored files.
 *
 * @module storage
 */

import crypto from 'crypto'
import { writeFile, readFile, stat, readdir, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { encryptBuffer, decryptBuffer } from './encryption'

// ══ Configuration ═══════════════════════════════════════════════════════════

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB PHI document limit

// ══ Directory layout ═════════════════════════════════════════════════════════

const PRIVATE_UPLOAD_ROOT = join(process.cwd(), 'private-uploads')

/**
 * Per-user storage directory (SHA-256 prefix, 12 chars).
 * Prevents raw userId exposure in filesystem paths.
 */
export function getUserStorageDir(userId: string): string {
  const prefix = crypto.createHash('sha256').update(userId).digest('hex').slice(0, 12)
  return join(PRIVATE_UPLOAD_ROOT, prefix)
}

/**
 * Ensure user storage directory exists.
 */
export async function ensureUserStorageDir(userId: string): Promise<string> {
  const dir = getUserStorageDir(userId)
  await mkdir(dir, { recursive: true })
  return dir
}

// ══ Core encryption primitives ════════════════════════════════════════════════

// ══ Core encryption re-exports (implemented in encryption.ts) ════════════════
// Storage module exposes these for compatibility; implementations live in encryption.ts.
// See src/lib/encryption.ts for the actual AES-256-GCM buffer cipher.
// encryptBuffer and decryptBuffer are imported directly from encryption.ts above

// ══ Content-addressed helpers ═══════════════════════════════════════════════─
// (uses encryptBuffer / decryptBuffer re-exported above)

const MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', gif: 'image/gif', webp: 'image/webp',
}

function detectMimeType(buffer: Buffer, filename: string): string {
  if (buffer.length >= 4) {
    const h = buffer.subarray(0, 4)
    if (h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4e) return 'image/png'
    if (h[0] === 0xff && h[1] === 0xd8) return 'image/jpeg'
    if (h[0] === 0x25 && h[1] === 0x50 && h[2] === 0x44 && h[3] === 0x46) return 'application/pdf'
  }
  const ext = filename.split('.').pop()?.toLowerCase()
  return MIME_MAP[ext || ''] || 'application/octet-stream'
}


/**
 * Metadata returned when a file is stored on disk.
 */
export interface StoredFile {
  fileToken: string         // opaque — use with retrieveEncryptedFile()
  originalName: string      // original filename (return to uploader only)
  mimeType: string          // detected MIME type
  size: number              // original (plaintext) size in bytes
  contentHash: string       // SHA-256(encrypted bytes)
  storedAt: Date            // when the file was stored
}

// ══ High-level API ════════════════════════════════════════════════════════════

/** Encrypt and store a file. Returns opaque token for retrieval. */
export async function storeEncryptedFile(
  userId: string,
  filename: string,
  buffer: Buffer
): Promise<StoredFile> {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${buffer.length} bytes (max ${MAX_FILE_SIZE})`)
  }

  const dir = await ensureUserStorageDir(userId)
  const safeName = filename.replace(/^.*[\\/]/, '').replace(/[^a-zA-Z0-9._-]/g, '')
  const ext = safeName.includes('.') ? `.${safeName.split('.').pop()}` : ''
  const fileId = crypto.randomBytes(16).toString('hex') // 128-bit
  const filepath = join(dir, `${fileId}${ext}`)

  const encryptedBuffer = encryptBuffer(buffer)
  await writeFile(filepath, encryptedBuffer)
  await chmod(filepath, 0o600)   // owner-only

  const contentHash = crypto.createHash('sha256').update(encryptedBuffer).digest('hex')
  const userPrefix  = crypto.createHash('sha256').update(userId).digest('hex').slice(0, 12)

  return {
    fileToken:   `${userPrefix}_${fileId}`,
    originalName: filename,
    mimeType:    detectMimeType(buffer, filename),
    size:        buffer.length,
    contentHash,
    storedAt:    new Date(),
  }
}

/** Retrieve and decrypt a stored file by its opaque token. */
export async function retrieveEncryptedFile(
  userId: string,
  fileToken: string
): Promise<{ buffer: Buffer; metadata: StoredFile }> {
  if (!fileToken || !fileToken.includes('_')) {
    throw new Error('Invalid file token format')
  }
  const [userPrefix, fileId] = fileToken.split('_')
  if (!userPrefix || !fileId || userPrefix.length < 8 || fileId.length < 16) {
    throw new Error('Invalid file token format')
  }
  const requesterPrefix = crypto.createHash('sha256').update(userId).digest('hex').slice(0, 12)
  if (userPrefix !== requesterPrefix) {
    throw new Error('Forbidden — file does not belong to you')
  }

  const dir = getUserStorageDir(userId)
  let targetName: string | null = null
  try {
    const entries = await readdir(dir)
    targetName = entries.find((e) => e.endsWith(fileId)) || null
  } catch {
    // directory doesn't exist
  }
  if (!targetName) throw new Error('File not found or already deleted')

  const filepath = join(dir, targetName)
  const fileStat = await stat(filepath)
  if (fileStat.size > MAX_FILE_SIZE * 2) throw new Error('File exceeds safety limit')
  if (fileStat.size < 32) throw new Error('Stored file is corrupted')

  const encryptedBuffer = await readFile(filepath)
  const buffer = decryptBuffer(encryptedBuffer)
  const contentHash = crypto.createHash('sha256').update(encryptedBuffer).digest('hex')

  return {
    buffer,
    metadata: {
      fileToken: fileToken,
      originalName: targetName,
      mimeType: detectMimeType(buffer, targetName),
      size: buffer.length,
      contentHash,
      storedAt: new Date(fileStat.mtime),
    },
  }
}

/** Securely delete a stored file (overwrite + remove). */
export async function deleteEncryptedFile(userId: string, fileToken: string): Promise<void> {
  const [userPrefix, fileId] = fileToken.split('_')
  if (!fileId) return // malformed token — nothing to delete
  const requesterPrefix = crypto.createHash('sha256').update(userId).digest('hex').slice(0, 12)
  if (userPrefix !== requesterPrefix) throw new Error('Forbidden')

  const dir = getUserStorageDir(userId)
  try {
    const entries = await readdir(dir)
    const target = entries.find((e) => e.endsWith(fileId))
    if (target) {
      const filepath = join(dir, target)
      // Overwrite ciphertext with zeros before deletion (extra precaution)
      const existing = await readFile(filepath)
      await writeFile(filepath, Buffer.alloc(existing.length))
      await unlink(filepath)
    }
  } catch {
    // already gone
  }
}

// ══ Private helpers ═══════════════════════════════════════════════════════════

async function chmod(filepath: string, mode: number): Promise<void> {
  try {
    const { chmod } = await import('fs/promises')
    await chmod(filepath, mode)
  } catch {
    // Non-critical: platform may not support POSIX permissions
  }
}
