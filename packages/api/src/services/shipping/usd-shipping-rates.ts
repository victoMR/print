// Tarifa de envío en USD: tabla fija admin-configurable (por env var), NO una
// cotización en vivo de paquetería como en MXN. Decisión del negocio: evitar
// exponer riesgo de tipo de cambio en envío, igual que el precio de producto
// en USD es manual y no auto-convertido.
const DEFAULT_BASE_USD = 12;
const DEFAULT_PER_EXTRA_ITEM_USD = 3;

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveUsdShipping(itemCount: number): {
  priceUsd: number;
  method: string;
  label: string;
} {
  const base = envNumber('USD_SHIPPING_BASE', DEFAULT_BASE_USD);
  const perExtraItem = envNumber('USD_SHIPPING_PER_EXTRA_ITEM', DEFAULT_PER_EXTRA_ITEM_USD);
  const extraItems = Math.max(0, itemCount - 1);
  const priceUsd = Math.round((base + extraItems * perExtraItem) * 100) / 100;

  return { priceUsd, method: 'usd_flat', label: 'International shipping' };
}
