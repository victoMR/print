import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestError } from '../types/errors.js';

vi.mock('../lib/db.js', () => ({
  pool: { query: vi.fn(), connect: vi.fn() },
}));

vi.mock('../db/mrpaps-products.repository.js', () => ({
  getVariantById: vi.fn(),
}));

const productsRepo = await import('../db/mrpaps-products.repository.js');
const { resolveLineItems } = await import('../services/mrpaps-catalog.service.js');

const BASE_VARIANT = {
  id: '22882a32-6745-462e-8bf8-eaed8bfaa316',
  size_label: 'M',
  color_label: 'Blanco',
  retail_price_mxn: '399.00',
  stock_quantity: 0,
  status: 'active',
  product: {
    id: 'p1',
    slug: 'mambooo',
    name: 'Mambooo',
    status: 'active',
    thumbnail_url: '/uploads/x.webp',
  },
};

describe('resolveLineItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects quantities above the cart cap', async () => {
    vi.mocked(productsRepo.getVariantById).mockResolvedValue(BASE_VARIANT as never);

    await expect(
      resolveLineItems([
        {
          variantId: BASE_VARIANT.id,
          quantity: 101,
          retailPriceMxn: '399.00',
        },
      ]),
    ).rejects.toThrow(BadRequestError);
  });

  it('rejects quantities above tracked stock', async () => {
    vi.mocked(productsRepo.getVariantById).mockResolvedValue({
      ...BASE_VARIANT,
      stock_quantity: 5,
    } as never);

    await expect(
      resolveLineItems([
        {
          variantId: BASE_VARIANT.id,
          quantity: 6,
          retailPriceMxn: '399.00',
        },
      ]),
    ).rejects.toThrow(/Solo hay 5 unidades/);
  });

  it('uses database price when client price matches', async () => {
    vi.mocked(productsRepo.getVariantById).mockResolvedValue(BASE_VARIANT as never);

    const lines = await resolveLineItems([
      {
        variantId: BASE_VARIANT.id,
        quantity: 2,
        retailPriceMxn: '399.00',
      },
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0]?.unitPriceMxn).toBe(399);
    expect(lines[0]?.quantity).toBe(2);
  });
});
