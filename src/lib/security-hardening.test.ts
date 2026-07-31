import { describe, expect, it, beforeAll } from 'vitest';
import {
  constantTimeEqual,
  hashSmsCode,
  verifySmsCode,
  encodeStoredSmsCode,
  decodeStoredSmsCode,
  SMS_MAX_ATTEMPTS,
  isValidSmsCode,
} from './patient-verify';
import { tierFromClaim, amountMatchesTier, PRICING } from './currency';

beforeAll(() => {
  // hashSmsCode requires an HMAC key; provide a stable one for tests.
  if (!process.env.ENCRYPTION_KEY && !process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = 'test-session-secret-for-security-hardening-suite';
  }
});

describe('SMS code storage hardening', () => {
  it('stores an HMAC digest, never the plaintext code', () => {
    const code = '483920';
    const digest = hashSmsCode(code);
    expect(digest).not.toBe(code);
    expect(digest).toMatch(/^[a-f0-9]{64}$/); // sha256 hex
  });

  it('verifies the correct code and rejects wrong/malformed codes', () => {
    const code = '483920';
    const digest = hashSmsCode(code);
    expect(verifySmsCode(code, digest)).toBe(true);
    expect(verifySmsCode('483921', digest)).toBe(false);
    expect(verifySmsCode('48392', digest)).toBe(false); // wrong length
    expect(verifySmsCode('abc123', digest)).toBe(false); // non-numeric
    expect(verifySmsCode('', digest)).toBe(false);
  });

  it('constantTimeEqual is exact and length-safe', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'ab')).toBe(false); // length mismatch — no throw
    expect(constantTimeEqual('', '')).toBe(true);
  });

  it('encodes/decodes the persisted attempt counter atomically', () => {
    const stored = encodeStoredSmsCode('ab'.repeat(32), 3);
    const decoded = decodeStoredSmsCode(stored);
    expect(decoded.hash).toBe('ab'.repeat(32));
    expect(decoded.attempts).toBe(3);

    // Round-trip after a failed attempt
    const bumped = encodeStoredSmsCode(decoded.hash, decoded.attempts + 1);
    expect(decodeStoredSmsCode(bumped).attempts).toBe(4);
  });

  it('handles legacy plaintext codes and malformed records gracefully', () => {
    const legacy = decodeStoredSmsCode('123456'); // pre-hashing format
    expect(legacy.hash).toBe('123456');
    expect(legacy.attempts).toBe(0);

    expect(decodeStoredSmsCode('').attempts).toBe(0);
    expect(decodeStoredSmsCode('hash:notanumber').attempts).toBe(0);
  });

  it('attempt cap is exported at 5', () => {
    expect(SMS_MAX_ATTEMPTS).toBe(5);
    expect(isValidSmsCode('123456')).toBe(true);
    expect(isValidSmsCode('12345')).toBe(false);
  });
});

describe('Stripe amount-to-tier verification', () => {
  it('maps client claims to canonical tier keys', () => {
    expect(tierFromClaim('plus')).toBe('plus');
    expect(tierFromClaim('family')).toBe('family_pro');
    expect(tierFromClaim('family_pro')).toBe('family_pro');
    expect(tierFromClaim('subscription')).toBeNull();
    expect(tierFromClaim(undefined)).toBeNull();
    expect(tierFromClaim(null)).toBeNull();
  });

  it('accepts monthly and yearly prices for the claimed tier', () => {
    const usdPlus = PRICING.USD.plus;
    expect(amountMatchesTier(usdPlus.monthly, 'usd', 'plus')).toBe(true);
    expect(amountMatchesTier(usdPlus.yearly, 'usd', 'plus')).toBe(true);

    const usdFamily = PRICING.USD.family_pro;
    expect(amountMatchesTier(usdFamily.monthly, 'usd', 'family_pro')).toBe(true);
    expect(amountMatchesTier(usdFamily.yearly, 'usd', 'family_pro')).toBe(true);
  });

  it('rejects a cheaper tier paid for a pricier claim (the upgrade-underpay attack)', () => {
    const plusMonthly = PRICING.USD.plus.monthly; // 9.99
    // Attacker pays the Plus price but claims Family → must NOT verify
    expect(amountMatchesTier(plusMonthly, 'usd', 'family_pro')).toBe(false);
  });

  it('rejects unknown currencies and off-by amounts', () => {
    expect(amountMatchesTier(19.99, 'xxx', 'family_pro')).toBe(false);
    // 19.98 is within the 0.01 float tolerance; 19.97 (2¢ off) must not pass
    expect(amountMatchesTier(19.97, 'usd', 'family_pro')).toBe(false);
    expect(amountMatchesTier(0, 'usd', 'plus')).toBe(false);
  });

  it('supports non-USD currencies defined in PRICING', () => {
    expect(amountMatchesTier(PRICING.EUR.plus.monthly, 'EUR', 'plus')).toBe(true);
    expect(amountMatchesTier(PRICING.GBP.family_pro.yearly, 'gbp', 'family_pro')).toBe(true);
  });
});
