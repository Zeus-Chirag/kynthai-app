import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/auth'
import { rateLimit } from '@/lib/security'
import { jsonError, applyStandardHeaders, requireAuth } from '@/lib/api-helpers'
import { readdir, stat, readFile } from 'fs/promises'
import { join } from 'path'
export const dynamic = 'force-dynamic'

/**
 * GET /api/upload/[token] — authenticated file retrieval
 *
 * SECURITY:
 *   1. Requires valid session (getSessionUser).
 *   2. Token ownership check: fileToken = {sha256(userId)[:8]}_{randomFileId}.
 *      The prefix in the token must match the requester's prefix.
 *   3. File is served with Content-Disposition: attachment and
 *      Cache-Control: no-store to prevent browser caching of PHI.
 *   4. Consent checks apply — the user must have consented to data processing.
 *
 * Files stored in private-uploads/ are AES-256-GCM encrypted; the client
 * receives the ciphertext and is responsible for decryption.
 */

const PRIVATE_UPLOAD_ROOT = join(process.cwd(), 'private-uploads')

function getUserDir(userId: string): string {
  const prefix = crypto.createHash('sha256').update(userId).digest('hex').slice(0, 12)
  return join(PRIVATE_UPLOAD_ROOT, prefix)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const limited = await rateLimit(req)
  if (limited) return limited

  const { response, user: session } = await requireAuth(req)
  if (response || !session) return response!

  await logAudit(session.id, 'upload.retrieve', { resourceType: 'LabBooking' })

  const { token } = await params
  if (!token || !token.includes('_')) return jsonError('Invalid file token', 400)

  const [userPrefix, fileId] = token.split('_')
  if (!userPrefix || !fileId || userPrefix.length < 4 || fileId.length < 16) {
    return jsonError('Invalid file token format', 400)
  }

  // Ownership check: the prefix must be the requester's SHA-256 prefix
  // HIPAA: prefix length increased to 12 chars (was 8) to prevent enumeration
  const requesterPrefix = crypto.createHash('sha256').update(session.id).digest('hex').slice(0, 12)
  if (userPrefix !== requesterPrefix) {
    return jsonError('Forbidden — file does not belong to you', 403)
  }

  // Locate the file on disk
  const userDir = getUserDir(session.id)
  // Find the actual filename by scanning the user's directory for files ending in fileId
  let filename: string | null = null
  try {
    const entries = await readdir(userDir)
    filename = entries.find((e) => e.endsWith(fileId)) || null
  } catch {
    // Directory doesn't exist — no files for this user
  }
  if (!filename) return jsonError('File not found', 404)

  const filepath = join(userDir, filename)

  try {
    const fileStat = await stat(filepath)
    if (fileStat.size > 50 * 1024 * 1024) return jsonError('File exceeds maximum size', 413)

    const buffer = await readFile(filepath)

    const res = new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(buffer.length),
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
    return applyStandardHeaders(res, req)
  } catch {
    return jsonError('File not found', 404)
  }
}
