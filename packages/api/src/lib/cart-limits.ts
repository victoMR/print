/** Máximo de unidades por línea en carrito y checkout. */
export const MAX_CART_LINE_QUANTITY = 100;

/**
 * is_pod decide si el inventario se rastrea, independientemente del número.
 * Antes se usaba stock_quantity <= 0 como señal de "sin límite", lo cual
 * volvía ilimitada cualquier variante rastreada que se agotara a 0.
 */
export function isTrackedStock(isPod: boolean): boolean {
  return !isPod;
}

export function maxPurchasableQuantity(stockQuantity: number, isPod: boolean): number {
  if (!isTrackedStock(isPod)) return MAX_CART_LINE_QUANTITY;
  return Math.min(MAX_CART_LINE_QUANTITY, stockQuantity);
}

export function clampCartLineQuantity(quantity: number, stockQuantity: number, isPod: boolean): number {
  const max = maxPurchasableQuantity(stockQuantity, isPod);
  const q = Math.floor(Number(quantity));
  if (!Number.isFinite(q) || q < 1) return 1;
  return Math.min(q, max);
}
