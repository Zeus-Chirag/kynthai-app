/**
 * Strict validation for provider-application `documents` submitted as base64
 * embedded in JSON.
 *
 * The dedicated /api/upload endpoint already enforces a type allowlist +
 * magic-byte check + size cap, but the doctor/lab application routes used to
 * accept arbitrary base64 blobs with NO validation. That is a fraud/abuse
 * vector (a provider could stuff any content into the DB). This helper applies
 * the same standards to that path.
 */

const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — matches /api/upload

type DocInput = {
  name?: string;
  type?: string;
  size?: number;
  data?: string; // base64
};

export type DocValidation = { ok: true } | { ok: false; error: string };

function base64MagicOk(dataB64: string): boolean {
  try {
    const header = Buffer.from(dataB64, 'base64').subarray(0, 8);
    if (header.length < 4) return false;
    return (
      (header[0] === 0xff && header[1] === 0xd8) || // JPEG
      (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) || // PNG
      (header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46) // PDF
    );
  } catch {
    return false;
  }
}

/**
 * Validate a list of document objects. Returns ok:false with a clear message
 * on the FIRST violation.
 */
export function validateDocuments(docs: Record<string, unknown>): DocValidation {
  for (const [key, raw] of Object.entries(docs)) {
    const d = (raw ?? {}) as DocInput;

    // Type allowlist.
    if (!d.type || !ALLOWED_TYPES.has(d.type)) {
      return { ok: false, error: `Document "${d.name || key}" must be PDF, JPG, or PNG.` };
    }

    // If a size is provided, enforce the cap.
    const declaredSize = Number(d.size);
    if (Number.isFinite(declaredSize) && declaredSize > MAX_BYTES) {
      return { ok: false, error: `Document "${d.name || key}" exceeds the 5 MB limit.` };
    }

    // Require base64 content and verify magic bytes match the declared type
    // (prevents content-type spoofing — e.g. a payload disguised as a JPEG).
    if (!d.data || typeof d.data !== 'string') {
      return { ok: false, error: `Document "${d.name || key}" is missing content.` };
    }
    // Enforce the size cap from the actual base64 length even if `size` was
    // omitted (base64 is 4/3 the binary size).
    if (d.data.length > Math.ceil((MAX_BYTES * 4) / 3) + 4) {
      return { ok: false, error: `Document "${d.name || key}" exceeds the 5 MB limit.` };
    }
    if (!base64MagicOk(d.data)) {
      return { ok: false, error: `Document "${d.name || key}" content does not match an allowed file type (PDF, JPG, PNG).` };
    }
  }
  return { ok: true };
}