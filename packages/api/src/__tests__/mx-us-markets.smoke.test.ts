import { describe, expect, it } from 'vitest';
import { createOrderBodySchema, estimateBodySchema } from '../schemas/mrpaps.schema.js';
import { countryForCurrency, marketForCurrency } from '../lib/market.js';

const item = { variantId: '11111111-1111-1111-1111-111111111111', quantity: 1 };

const mxRecipient = {
  name: 'Ana',
  email: 'a@b.com',
  phone: '3312345678',
  address1: 'Calle 1',
  city: 'Guadalajara',
  stateCode: 'JAL' as const,
  countryCode: 'MX' as const,
  zip: '44100',
};

const usRecipient = {
  name: 'Bob',
  email: 'b@b.com',
  phone: '5551234567',
  address1: '1 Main St',
  city: 'Los Angeles',
  stateCode: 'CA' as const,
  countryCode: 'US' as const,
  zip: '90001',
};

function costs(currency: 'MXN' | 'USD') {
  return {
    currency,
    subtotal: '10.00',
    shipping: '5.00',
    tax: '1.60',
    total: '16.60',
  };
}

describe('MX/US market country matching', () => {
  it('accepts MXN with Mexico address', () => {
    const r = createOrderBodySchema.safeParse({
      items: [item],
      recipient: mxRecipient,
      retailCosts: costs('MXN'),
    });
    expect(r.success).toBe(true);
  });

  it('accepts USD with US address', () => {
    const r = createOrderBodySchema.safeParse({
      items: [item],
      recipient: usRecipient,
      retailCosts: costs('USD'),
    });
    expect(r.success).toBe(true);
  });

  it('rejects MXN with US address', () => {
    const r = createOrderBodySchema.safeParse({
      items: [item],
      recipient: usRecipient,
      retailCosts: costs('MXN'),
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.message.includes('/us') || i.message.includes('México'))).toBe(
        true,
      );
    }
  });

  it('rejects USD with MX address', () => {
    const r = createOrderBodySchema.safeParse({
      items: [item],
      recipient: mxRecipient,
      retailCosts: costs('USD'),
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.message.includes('/mx') || i.message.includes('Estados Unidos')),
      ).toBe(true);
    }
  });

  it('estimate rejects cross-market addresses', () => {
    expect(
      estimateBodySchema.safeParse({ currency: 'MXN', items: [item], address: usRecipient }).success,
    ).toBe(false);
    expect(
      estimateBodySchema.safeParse({ currency: 'USD', items: [item], address: mxRecipient }).success,
    ).toBe(false);
  });

  it('estimate accepts matching markets', () => {
    expect(
      estimateBodySchema.safeParse({ currency: 'MXN', items: [item], address: mxRecipient }).success,
    ).toBe(true);
    expect(
      estimateBodySchema.safeParse({ currency: 'USD', items: [item], address: usRecipient }).success,
    ).toBe(true);
  });

  it('market helpers map currency to country', () => {
    expect(marketForCurrency('MXN')).toBe('mx');
    expect(marketForCurrency('USD')).toBe('us');
    expect(countryForCurrency('MXN')).toBe('MX');
    expect(countryForCurrency('USD')).toBe('US');
  });
});
