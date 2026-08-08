import { describe, it, expect } from 'vitest';
import { isDisposableEmail, isUserBlocked, BLOCK_LEVEL } from '@/lib/fraud-guard';
import { validateDocuments } from '@/lib/document-validation';

describe('fraud-guard: disposable email detection', () => {
  it('rejects known throwaway providers', () => {
    expect(isDisposableEmail('x@mailinator.com')).toBe(true);
    expect(isDisposableEmail('x@guerrillamail.com')).toBe(true);
    expect(isDisposableEmail('x@10minutemail.net')).toBe(true);
    expect(isDisposableEmail('x@yopmail.com')).toBe(true);
    expect(isDisposableEmail('x@temp-mail.org')).toBe(true);
    expect(isDisposableEmail('x@sharklasers.com')).toBe(true);
  });

  it('allows normal providers', () => {
    expect(isDisposableEmail('x@gmail.com')).toBe(false);
    expect(isDisposableEmail('x@outlook.com')).toBe(false);
    expect(isDisposableEmail('x@kynthai.app')).toBe(false);
    expect(isDisposableEmail('')).toBe(false);
  });
});

describe('fraud-guard: block state', () => {
  it('detects a blocked profile and ignores others', () => {
    expect(isUserBlocked({ verificationLevel: BLOCK_LEVEL })).toBe(true);
    expect(isUserBlocked({ verificationLevel: 'unverified' })).toBe(false);
    expect(isUserBlocked({ verificationLevel: null })).toBe(false);
    expect(isUserBlocked(null)).toBe(false);
    expect(isUserBlocked(undefined)).toBe(false);
  });
});

describe('document-validation: strict upload guards', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]).toString('base64');
  const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 1, 2, 3]).toString('base64');
  const notImage = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 1, 2, 3]).toString('base64'); // MZ = exe

  it('accepts a real PNG with matching type', () => {
    const r = validateDocuments({ license: { name: 'id.png', type: 'image/png', data: png } });
    expect(r.ok).toBe(true);
  });

  it('accepts a real PDF with matching type', () => {
    const r = validateDocuments({ license: { name: 'doc.pdf', type: 'application/pdf', data: pdf } });
    expect(r.ok).toBe(true);
  });

  it('rejects a disguised payload (exe bytes claimed as PNG)', () => {
    const r = validateDocuments({ license: { name: 'fake.png', type: 'image/png', data: notImage } });
    expect(r.ok).toBe(false);
  });

  it('rejects disallowed MIME types', () => {
    const r = validateDocuments({ license: { name: 'x.exe', type: 'application/x-msdownload', data: notImage } });
    expect(r.ok).toBe(false);
  });

  it('rejects missing content', () => {
    const r = validateDocuments({ license: { name: 'x.png', type: 'image/png' } });
    expect(r.ok).toBe(false);
  });

  it('rejects oversized content via base64 length', () => {
    const big = Buffer.alloc(6 * 1024 * 1024, 0x89).toString('base64');
    const r = validateDocuments({ license: { name: 'big.png', type: 'image/png', data: big } });
    expect(r.ok).toBe(false);
  });
});