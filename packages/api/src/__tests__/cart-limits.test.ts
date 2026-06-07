import { describe, it, expect } from 'vitest';
import {
  MAX_CART_LINE_QUANTITY,
  clampCartLineQuantity,
  isTrackedStock,
  maxPurchasableQuantity,
} from '../lib/cart-limits.js';

describe('cart limits', () => {
  it('caps at MAX_CART_LINE_QUANTITY for untracked stock', () => {
    expect(maxPurchasableQuantity(0)).toBe(MAX_CART_LINE_QUANTITY);
    expect(clampCartLineQuantity(500, 0)).toBe(MAX_CART_LINE_QUANTITY);
  });

  it('respects tracked inventory below the cart cap', () => {
    expect(isTrackedStock(12)).toBe(true);
    expect(maxPurchasableQuantity(12)).toBe(12);
    expect(clampCartLineQuantity(99, 12)).toBe(12);
  });

  it('respects tracked inventory above the cart cap', () => {
    expect(maxPurchasableQuantity(250)).toBe(MAX_CART_LINE_QUANTITY);
  });

  it('normalizes invalid quantities to 1', () => {
    expect(clampCartLineQuantity(0, 0)).toBe(1);
    expect(clampCartLineQuantity(-3, 0)).toBe(1);
  });
});
