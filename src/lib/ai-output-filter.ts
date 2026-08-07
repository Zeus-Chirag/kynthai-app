/**
 * AI Output Safety Filters
 *
 * Detects and redacts PHI/PII from AI responses before rendering to UI.
 * Patterns based on HIPAA Safe Harbor identifiers + common PII.
 *
 * IMPORTANT (2026-08): This filter redacts TRUE identifiers only — SSNs,
 * phone numbers, emails, MRNs, dates of birth, street addresses, ZIP codes,
 * credit cards, and passport numbers. Drug names, dosages, and dosing
 * frequencies are CORE PRODUCT CONTENT, not PHI, and must NEVER be redacted
 * (a previous version did, mangling every medication answer in the AI chat).
 * Name detection is deliberately conservative (title- or declaration-prefixed)
 * so capitalized medical phrases like "Blood Pressure" or "Heart Attack" are
 * never mistaken for patient names.
 */

// ── True PHI identifiers (HIPAA Safe Harbor + common PII) ────────────────
const PHI_PATTERNS: { name: string; pattern: RegExp }[] = [
  // Names — only when clearly presented as a person's name (title-prefixed,
  // e.g. "Dr. Jane Smith") or name-declared ("patient John", "named Sarah").
  {
    name: 'name',
    pattern: /\b(?:Mr|Mrs|Ms|Dr|Miss|Mx)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g,
  },
  {
    name: 'name',
    pattern: /\b(?:patient|my name is|named|called)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/gi,
  },
  // SSN
  { name: 'ssn', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  // Phone (US)
  { name: 'phone', pattern: /\b(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
  // Email
  { name: 'email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  // Medical record numbers
  { name: 'mrn', pattern: /\b(?:MRN|MR|medical record)[\s:#]*([A-Z0-9]{6,12})\b/gi },
  // Date of birth (MM/DD/YYYY or YYYY-MM-DD)
  { name: 'dob', pattern: /\b(?:0?[1-9]|1[0-2])[\/\-](?:0?[1-9]|[12]\d|3[01])[\/\-](?:19|20)\d{2}\b/g },
  { name: 'dob', pattern: /\b(?:19|20)\d{2}[\/\-](?:0?[1-9]|1[0-2])[\/\-](?:0?[1-9]|[12]\d|3[01])\b/g },
  // Street address
  {
    name: 'address',
    pattern: /\b\d+\s+[A-Za-z0-9\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl)\b/gi,
  },
  // ZIP code — exclude 5-digit runs followed by a dosage unit so lab values
  // like "10000 units" or "15000 IU" are never destroyed.
  {
    name: 'zip',
    pattern: /\b\d{5}(?:-\d{4})?\b(?!\s*(?:mg|mcg|ml|g|units?|IU|tablets?|pills?|capsules?)\b)/gi,
  },
  // Credit card (format-level)
  { name: 'credit_card', pattern: /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g },
  // Passport numbers (basic)
  { name: 'passport', pattern: /\b[A-Z]{1,2}\d{6,9}\b/g },
];

// Sentinel used during redaction so replacement markers can never be
// re-matched by later patterns (prevents "[REDACTED [REDACTED X]]" corruption).
const SENTINEL = '\u0001';

export interface RedactionResult {
  text: string;
  redacted: boolean;
  categories: string[];
}

export function redactPHI(text: string): RedactionResult {
  if (!text || typeof text !== 'string') {
    return { text: text || '', redacted: false, categories: [] };
  }

  let result = text;
  const categories: string[] = [];

  for (const { name, pattern } of PHI_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(result)) {
      pattern.lastIndex = 0;
      result = result.replace(pattern, () => `${SENTINEL}${name}${SENTINEL}`);
      if (!categories.includes(name)) categories.push(name);
    }
  }

  const redacted = categories.length > 0;

  // Restore sentinels into human-readable markers.
  result = result.replace(
    new RegExp(`${SENTINEL}([a-z_]+)${SENTINEL}`, 'g'),
    (_, cat: string) => `[REDACTED ${cat.toUpperCase()}]`
  );

  return { text: result, redacted, categories };
}

export function safeAIResponse(text: string): string {
  const { text: cleaned } = redactPHI(text);
  return cleaned;
}

// For streaming responses - chunk-safe redaction
export function createStreamingRedactor() {
  let buffer = '';
  return {
    process(chunk: string): string {
      buffer += chunk;
      // Only redact when we have a complete sentence or buffer is large
      if (buffer.length > 500 || /[.!?]\s*$/.test(buffer)) {
        const { text } = redactPHI(buffer);
        const output = text;
        buffer = '';
        return output;
      }
      return ''; // Hold buffer
    },
    flush(): string {
      if (buffer) {
        const { text } = redactPHI(buffer);
        buffer = '';
        return text;
      }
      return '';
    },
  };
}

// ───────────────────────────────────────────────────────────────────────
// Response post-processors — deterministic safety/quality fixes that
// don't depend on LLM compliance. Applied AFTER safeAIResponse and
// BEFORE persistence/return so the user sees the corrected version
// (and the streaming `done` event delivers the corrected final text).
// ───────────────────────────────────────────────────────────────────────

/**
 * Normalize markdown heading spacing.
 *
 * LLMs frequently emit `## HeadingBody text` with no blank line between
 * the heading and the body, which collapses the heading into a paragraph
 * in most renderers. This pass inserts a blank line after any markdown
 * heading that isn't already followed by one. Deterministic; safe.
 */
export function normalizeMarkdownSpacing(text: string): string {
  if (!text) return text;
  // Match a heading line (## or ###) that is NOT followed by a blank line.
  // The lookahead (?!\n\n) asserts "not followed by two newlines".
  return text.replace(
    /(^|\n)(#{1,6}\s+[^\n]+)(?!\n\n)(?=\S)/g,
    (_m, lead: string, heading: string) => `${lead}${heading}\n`
  );
}

/** Patient is on an anticoagulant/antiplatelet if any of their med names
 * contains one of these substrings (case-insensitive). */
function isOnAnticoagulantOrAntiplatelet(patientMeds: string[]): boolean {
  const m = patientMeds.join(' ').toLowerCase();
  // Anticoagulants: DOACs + warfarin + heparin/LMWH
  if (/\b(apixaban|rivaroxaban|dabigatran|edoxaban|warfarin|heparin|enoxaparin)\b/.test(m)) return true;
  // Antiplatelets
  if (/\b(aspirin|clopidogrel|prasugrel|ticagrelor|dipyridamole)\b/.test(m)) return true;
  return false;
}

/** Common OTC NSAID names to detect in the AI response. */
const NSAID_NAMES_RE = /\b(ibuprofen|advil|motrin|naproxen|aleve|diclofenac|voltaren|celecoxib|celebrex|meloxicam|mobic|indomethacin|indocin|ketorolac|toradol|piroxicam|feldene|aspirin[ ,])\b/gi;

/**
 * NSAID-safety enforcement for patients on anticoagulants/antiplatelets.
 *
 * The system prompt tells the LLM not to recommend NSAIDs to these
 * patients, but LLMs still occasionally do (e.g. recommending ibuprofen
 * for a headache to a patient on apixaban + aspirin — a real triple
 * bleeding risk). This pass is a deterministic safety net: if the
 * patient is on an anticoagulant or antiplatelet and the response
 * recommends an NSAID, we append a clear safety correction naming
 * acetaminophen (Tylenol) as the safer alternative.
 *
 * Returns { text, flagged } so callers can log when the safety net
 * actually fired (useful for monitoring how often the LLM drifts).
 */
export function enforceNsaidSafetyForAnticoagulatedPatients(
  text: string,
  patientMeds: string[]
): { text: string; flagged: boolean } {
  if (!text) return { text, flagged: false };
  if (!isOnAnticoagulantOrAntiplatelet(patientMeds)) return { text, flagged: false };
  // Only run if the response actually mentions/recommends an NSAID.
  // Reset the regex's lastIndex (it's /g).
  NSAID_NAMES_RE.lastIndex = 0;
  if (!NSAID_NAMES_RE.test(text)) return { text, flagged: false };

  const correction =
    "\n\n> **Safety check:** Because you're on a blood-thinning medication, avoid ibuprofen, naproxen, and other NSAIDs for pain relief — they sharply increase bleeding risk when combined with your anticoagulant/antiplatelet. **Acetaminophen (Tylenol)** is the safer OTC option; follow the label dose and ask your pharmacist if you're unsure.";
  return { text: text + correction, flagged: true };
}
