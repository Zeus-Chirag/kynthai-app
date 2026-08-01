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
