/** Debe coincidir con packages/api/src/lib/cart-limits.ts */
export const MAX_CART_LINE_QUANTITY = 100;

export function clampCartLineQuantity(quantity: number, maxAvailable = MAX_CART_LINE_QUANTITY): number {
  const q = Math.floor(Number(quantity));
  if (!Number.isFinite(q) || q < 1) return 1;
  return Math.min(q, maxAvailable);
}
