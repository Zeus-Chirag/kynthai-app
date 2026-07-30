/**
 * AI Output Safety Filters
 *
 * Detects and redacts PHI/PII from AI responses before rendering to UI.
 * Patterns based on HIPAA Safe Harbor identifiers + common PII.
 */

// PHI identifiers (HIPAA Safe Harbor)
const PHI_PATTERNS = [
  // Names (basic pattern - first Last)
  /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
  // SSN
  /\b\d{3}-\d{2}-\d{4}\b/g,
  // Phone numbers (US)
  /\b(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  // Email
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // Medical record numbers (alphanumeric, 6-12 chars)
  /\b(?:MRN|MR|medical record)[\s:#]*([A-Z0-9]{6,12})\b/gi,
  // Date of birth (MM/DD/YYYY or YYYY-MM-DD)
  /\b(?:0?[1-9]|1[0-2])[\/\-](?:0?[1-9]|[12]\d|3[01])[\/\-](?:19|20)\d{2}\b/g,
  /\b(?:19|20)\d{2}[\/\-](?:0?[1-9]|1[0-2])[\/\-](?:0?[1-9]|[12]\d|3[01])\b/g,
  // Address (basic street address pattern)
  /\b\d+\s+[A-Za-z0-9\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl)\b/gi,
  // Zip codes
  /\b\d{5}(?:-\d{4})?\b/g,
  // Credit card (basic Luhn-valid pattern not checked, just format)
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  // License plates (basic US pattern)
  /\b[A-Z]{1,7}\b/g,
  // Passport numbers (basic)
  /\b[A-Z]{1,2}\d{6,9}\b/g,
];

// Medical-specific patterns
const MEDICAL_PATTERNS = [
  // Drug names (common brands - not exhaustive)
  /\b(?:Lisinopril|Metformin|Atorvastatin|Levothyroxine|Amlodipine|Losartan|Metoprolol|Omeprazole|Simvastatin|Gabapentin|Hydrochlorothiazide|Furosemide|Prednisone|Amoxicillin|Azithromycin|Ciprofloxacin|Doxycycline|Cephalexin|Clindamycin|Bactrim|Augmentin|Zithromax|Keflex|Flagyl|Cipro|Levaquin|Biaxin|Cleocin|Rocephin|Zosyn|Vancocin|Tazicef|Cefepime|Meropenem|Imipenem|Doripenem|Ertapenem|Aztreonam|Tigecycline|Daptomycin|Linezolid|Tedizolid|Ceftaroline|Ceftobiprole|Dalbavancin|Oritavancin|Telavancin|Ceftolozane|Ceftazidime|Avibactam|Meropenem|Vaborbactam|Imipenem|Relebactam|Cefiderocol|Plazomicin|Eravacycline|Omadacycline|Sarecycline|Delafloxacin|Lefamulin|Iclaprim|Gepotidacin|Zoliflodacin|Epetraborole|Sulopenem|Tebipenem|Benapenem|Razupenem|Sanfetrinem|GSK1322322|Gepotidacin|Zoliflodacin)\b/gi,
  // Dosage patterns
  /\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|mL|units|IU)\b/gi,
  // Frequency patterns
  /\b(?:once|twice|three times|four times|daily|weekly|monthly|every \d+ hours?|every \d+ days?|q\d+h|q\d+d|bid|tid|qid|prn|hs|ac|pc)\b/gi,
  // ICD-10 codes
  /\b[A-TV-Z][0-9][0-9AB]\.?[0-9A-TV-Z]{0,4}\b/g,
  // CPT codes
  /\b\d{5}\b/g,
  // NPI numbers
  /\b\d{10}\b/g,
];

const ALL_PATTERNS = [...PHI_PATTERNS, ...MEDICAL_PATTERNS];

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
  let redacted = false;

  // Check each pattern category
  const checks: { name: string; patterns: RegExp[] }[] = [
    { name: 'name', patterns: [PHI_PATTERNS[0]!] },
    { name: 'ssn', patterns: [PHI_PATTERNS[1]!] },
    { name: 'phone', patterns: [PHI_PATTERNS[2]!] },
    { name: 'email', patterns: [PHI_PATTERNS[3]!] },
    { name: 'mrn', patterns: [PHI_PATTERNS[4]!] },
    { name: 'dob', patterns: [PHI_PATTERNS[5]!, PHI_PATTERNS[6]!] },
    { name: 'address', patterns: [PHI_PATTERNS[7]!] },
    { name: 'zip', patterns: [PHI_PATTERNS[8]!] },
    { name: 'credit_card', patterns: [PHI_PATTERNS[9]!] },
    { name: 'license_plate', patterns: [PHI_PATTERNS[10]!] },
    { name: 'passport', patterns: [PHI_PATTERNS[11]!] },
    { name: 'drug', patterns: [MEDICAL_PATTERNS[0]!] },
    { name: 'dosage', patterns: [MEDICAL_PATTERNS[1]!] },
    { name: 'frequency', patterns: [MEDICAL_PATTERNS[2]!] },
    { name: 'icd10', patterns: [MEDICAL_PATTERNS[3]!] },
    { name: 'cpt', patterns: [MEDICAL_PATTERNS[4]!] },
    { name: 'npi', patterns: [MEDICAL_PATTERNS[5]!] },
  ];

  for (const check of checks) {
    for (const pattern of check.patterns) {
      if (pattern.test(result)) {
        result = result.replace(pattern, `[REDACTED ${check.name.toUpperCase()}]`);
        redacted = true;
        if (!categories.includes(check.name)) {
          categories.push(check.name);
        }
      }
    }
  }

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