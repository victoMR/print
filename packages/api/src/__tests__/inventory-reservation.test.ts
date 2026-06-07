import { describe, it, expect, vi } from 'vitest';
import type { PoolClient } from 'pg';
import { isTrackedStock } from '../lib/cart-limits.js';

vi.mock('../lib/db.js', () => ({
  pool: { query: vi.fn(), connect: vi.fn() },
}));

const { assertVariantStockAvailableTx, reserveVariantStockTx, releaseVariantStockTx } =
  await import('../db/mrpaps-products.repository.js');

function mockClient(sequence: Array<{ rows: unknown[] }>): PoolClient {
  let call = 0;
  return {
    query: vi.fn(async () => {
      const result = sequence[call] ?? { rows: [] };
      call += 1;
      return result;
    }),
  } as unknown as PoolClient;
}

describe('inventory reservation', () => {
  it('isTrackedStock treats zero as POD unlimited', () => {
    expect(isTrackedStock(0)).toBe(false);
    expect(isTrackedStock(2)).toBe(true);
  });

  it('assertVariantStockAvailableTx checks without decrementing', async () => {
    const client = mockClient([{ rows: [{ stock_quantity: '2' }] }]);

    const available = await assertVariantStockAvailableTx(client, 'variant-1', 2);
    expect(available).toBe(2);
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('reserves tracked stock when available', async () => {
    const client = mockClient([
      { rows: [{ stock_quantity: '2' }] },
      { rows: [] },
    ]);

    const reserved = await reserveVariantStockTx(client, 'variant-1', 2);
    expect(reserved).toBe(2);
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it('rejects when tracked stock is insufficient', async () => {
    const client = mockClient([{ rows: [{ stock_quantity: '1' }] }]);

    const reserved = await reserveVariantStockTx(client, 'variant-1', 2);
    expect(reserved).toBe(false);
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('skips reservation for POD (stock_quantity 0)', async () => {
    const client = mockClient([{ rows: [{ stock_quantity: '0' }] }]);

    const reserved = await reserveVariantStockTx(client, 'variant-1', 5);
    expect(reserved).toBe(0);
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('releaseVariantStockTx adds quantity back', async () => {
    const client = mockClient([{ rows: [] }]);

    await releaseVariantStockTx(client, 'variant-1', 2);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('stock_quantity = stock_quantity + $2'),
      ['variant-1', 2],
    );
  });
});
