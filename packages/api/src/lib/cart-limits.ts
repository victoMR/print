/** Máximo de unidades por línea en carrito y checkout. */
export const MAX_CART_LINE_QUANTITY = 100;

/** stock_quantity <= 0 → POD / sin inventario rastreado. */
export function isTrackedStock(stockQuantity: number): boolean {
  return stockQuantity > 0;
}

export function maxPurchasableQuantity(stockQuantity: number): number {
  if (!isTrackedStock(stockQuantity)) return MAX_CART_LINE_QUANTITY;
  return Math.min(MAX_CART_LINE_QUANTITY, stockQuantity);
}

export function clampCartLineQuantity(quantity: number, stockQuantity: number): number {
  const max = maxPurchasableQuantity(stockQuantity);
  const q = Math.floor(Number(quantity));
  if (!Number.isFinite(q) || q < 1) return 1;
  return Math.min(q, max);
}
