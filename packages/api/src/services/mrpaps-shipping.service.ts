import type { MrpapsShippingRatesBody } from '../schemas/mrpaps.schema.js';

const SHIPPING_OPTIONS = [
  {
    id: 'STANDARD' as const,
    name: 'Envío estándar',
    minDays: 5,
    maxDays: 14,
    baseMxn: 99,
    perItemMxn: 15,
  },
  {
    id: 'EXPRESS' as const,
    name: 'Envío express',
    minDays: 3,
    maxDays: 7,
    baseMxn: 179,
    perItemMxn: 25,
  },
];

export function getLocalShippingRates(input: MrpapsShippingRatesBody) {
  const itemCount = input.items.reduce((sum, i) => sum + i.quantity, 0);

  const rates = SHIPPING_OPTIONS.map((opt) => {
    const price = opt.baseMxn + opt.perItemMxn * Math.max(0, itemCount - 1);
    return {
      id: opt.id,
      name: opt.name,
      priceMxn: price.toFixed(2),
      minDays: opt.minDays,
      maxDays: opt.maxDays,
    };
  });

  return { rates };
}

export function getShippingLabel(method: string): string {
  return SHIPPING_OPTIONS.find((o) => o.id === method)?.name ?? method;
}

export function getShippingPriceMxn(method: string, itemCount: number): number {
  const opt = SHIPPING_OPTIONS.find((o) => o.id === method) ?? SHIPPING_OPTIONS[0];
  const count = Math.max(1, itemCount);
  return opt.baseMxn + opt.perItemMxn * Math.max(0, count - 1);
}
