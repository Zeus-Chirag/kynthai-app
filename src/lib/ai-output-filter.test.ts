import { describe, expect, it } from 'vitest';
import { redactPHI, safeAIResponse, createStreamingRedactor } from './ai-output-filter';

describe('PHI redaction (true identifiers only)', () => {
  it('redacts SSN, email, and DOB in a single string', () => {
    const r = redactPHI('My SSN is 123-45-6789, email jane@example.com, DOB 01/15/1980');
    expect(r.redacted).toBe(true);
    expect(r.text).toContain('[REDACTED SSN]');
    expect(r.text).toContain('[REDACTED EMAIL]');
    expect(r.text).toContain('[REDACTED DOB]');
    for (const c of ['ssn', 'email', 'dob']) expect(r.categories).toContain(c);
  });

  it('never double-redacts markers (no nested [REDACTED [REDACTED ...]])', () => {
    const r = redactPHI('My SSN is 123-45-6789 and email jane@example.com');
    expect(r.text).not.toMatch(/\[REDACTED \[REDACTED/);
    expect(r.text.match(/\[REDACTED SSN\]/g)?.length).toBe(1);
    expect(r.text.match(/\[REDACTED EMAIL\]/g)?.length).toBe(1);
  });

  it('redacts title-prefixed names but keeps medical phrases', () => {
    const r = redactPHI('Dr. Jane Smith prescribed Blood Pressure medication for Heart Attack prevention');
    expect(r.text).toContain('[REDACTED NAME]');
    expect(r.text).not.toContain('Jane Smith');
    // Medical phrases are NOT names — they must be preserved.
    expect(r.text).toContain('Blood Pressure');
    expect(r.text).toContain('Heart Attack');
    expect(r.text).toContain('medication');
  });

  it('redacts phone numbers and addresses', () => {
    const r = redactPHI('Call 555-123-4567 or visit 123 Main Street, Springfield');
    expect(r.categories).toContain('phone');
    expect(r.categories).toContain('address');
    expect(r.text).toContain('[REDACTED PHONE]');
    expect(r.text).toContain('[REDACTED ADDRESS]');
  });

  it('handles empty and non-string input safely', () => {
    expect(redactPHI('')).toEqual({ text: '', redacted: false, categories: [] });
    expect(redactPHI(undefined as unknown as string)).toEqual({
      text: '',
      redacted: false,
      categories: [],
    });
  });
});

describe('Medical content preservation (core product content is NOT PHI)', () => {
  it('keeps drug names intact', () => {
    const r = redactPHI('Metformin is used for type 2 diabetes.');
    expect(r.redacted).toBe(false);
    expect(r.text).toContain('Metformin');
  });

  it('keeps dosages and frequencies intact', () => {
    const r = redactPHI('Take 500 mg twice daily with food. Do not exceed 1000 mg per day.');
    expect(r.redacted).toBe(false);
    expect(r.text).toContain('500 mg');
    expect(r.text).toContain('twice daily');
    expect(r.text).toContain('1000 mg');
  });

  it('keeps capitalized medical phrases and acronyms intact', () => {
    const r = redactPHI('Blood Pressure medication can interact with NSAIDs like Ibuprofen.');
    expect(r.redacted).toBe(false);
    expect(r.text).toContain('Blood Pressure');
    expect(r.text).toContain('NSAIDs');
    expect(r.text).toContain('Ibuprofen');
  });

  it('keeps demo-mode medicine list intact', () => {
    const r = redactPHI('I can help with 20+ common medicines including Metformin, Atorvastatin, Amoxicillin.');
    expect(r.redacted).toBe(false);
    expect(r.text).toContain('Atorvastatin');
    expect(r.text).toContain('Amoxicillin');
  });

  it('does not redact 5-digit lab values when followed by a unit', () => {
    const r = redactPHI('Your vitamin D level is 15000 IU and B12 is 10000 units.');
    expect(r.redacted).toBe(false);
    expect(r.text).toContain('15000 IU');
    expect(r.text).toContain('10000 units');
  });
});

describe('safeAIResponse and streaming redactor', () => {
  it('safeAIResponse returns cleaned text and passes through clean text', () => {
    expect(safeAIResponse('SSN 123-45-6789 present')).toContain('[REDACTED SSN]');
    expect(safeAIResponse('Metformin 500 mg twice daily')).toBe('Metformin 500 mg twice daily');
  });

  it('streaming redactor holds partial chunks and redacts on flush', () => {
    const redactor = createStreamingRedactor();
    expect(redactor.process('Hello there, my SSN is ')).toBe(''); // held
    const flushed = redactor.process('123-45-6789.');
    expect(flushed).toContain('[REDACTED SSN]');
    expect(redactor.flush()).toBe('');
  });
});
