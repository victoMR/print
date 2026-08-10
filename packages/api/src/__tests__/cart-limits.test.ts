import { describe, it, expect } from 'vitest';
import {
  MAX_CART_LINE_QUANTITY,
  clampCartLineQuantity,
  isTrackedStock,
  maxPurchasableQuantity,
} from '../lib/cart-limits.js';

describe('cart limits', () => {
  it('caps at MAX_CART_LINE_QUANTITY for untracked (POD) stock', () => {
    expect(maxPurchasableQuantity(0, true)).toBe(MAX_CART_LINE_QUANTITY);
    expect(clampCartLineQuantity(500, 0, true)).toBe(MAX_CART_LINE_QUANTITY);
  });

  it('respects tracked inventory below the cart cap', () => {
    expect(isTrackedStock(false)).toBe(true);
    expect(maxPurchasableQuantity(12, false)).toBe(12);
    expect(clampCartLineQuantity(99, 12, false)).toBe(12);
  });

  it('respects tracked inventory above the cart cap', () => {
    expect(maxPurchasableQuantity(250, false)).toBe(MAX_CART_LINE_QUANTITY);
  });

  it('treats tracked stock at exactly zero as out of stock, not unlimited', () => {
    expect(maxPurchasableQuantity(0, false)).toBe(0);
    expect(clampCartLineQuantity(5, 0, false)).toBe(0);
  });

  it('normalizes invalid quantities to 1, unless tracked stock is 0', () => {
    expect(clampCartLineQuantity(0, 0, true)).toBe(1);
    expect(clampCartLineQuantity(-3, 0, true)).toBe(1);
  });
});
