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
  it('isTrackedStock is driven by is_pod, not the stock number', () => {
    expect(isTrackedStock(true)).toBe(false);
    expect(isTrackedStock(false)).toBe(true);
  });

  it('assertVariantStockAvailableTx checks the market-specific column without decrementing', async () => {
    const client = mockClient([{ rows: [{ is_pod: false, stock: '2' }] }]);

    const available = await assertVariantStockAvailableTx(client, 'variant-1', 2, 'mx');
    expect(available).toBe(2);
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('reserves tracked MX stock when available', async () => {
    const client = mockClient([
      { rows: [{ is_pod: false, stock: '2' }] },
      { rows: [] },
    ]);

    const reserved = await reserveVariantStockTx(client, 'variant-1', 2, 'mx');
    expect(reserved).toBe(2);
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it('reserves tracked US stock independently from MX', async () => {
    const client = mockClient([
      { rows: [{ is_pod: false, stock: '3' }] },
      { rows: [] },
    ]);

    const reserved = await reserveVariantStockTx(client, 'variant-1', 3, 'us');
    expect(reserved).toBe(3);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('stock_quantity_us = stock_quantity_us - $2'),
      ['variant-1', 3],
    );
  });

  it('rejects when tracked stock is insufficient', async () => {
    const client = mockClient([{ rows: [{ is_pod: false, stock: '1' }] }]);

    const reserved = await reserveVariantStockTx(client, 'variant-1', 2, 'mx');
    expect(reserved).toBe(false);
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('rejects (does not treat as unlimited) when tracked stock is exactly 0', async () => {
    const client = mockClient([{ rows: [{ is_pod: false, stock: '0' }] }]);

    const reserved = await reserveVariantStockTx(client, 'variant-1', 1, 'mx');
    expect(reserved).toBe(false);
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('skips reservation for POD (is_pod true), regardless of stock number', async () => {
    const client = mockClient([{ rows: [{ is_pod: true, stock: '0' }] }]);

    const reserved = await reserveVariantStockTx(client, 'variant-1', 5, 'mx');
    expect(reserved).toBe(0);
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('releaseVariantStockTx adds quantity back to the market-specific column', async () => {
    const client = mockClient([{ rows: [] }]);

    await releaseVariantStockTx(client, 'variant-1', 2, 'mx');
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('stock_quantity_mx = stock_quantity_mx + $2'),
      ['variant-1', 2],
    );
  });
});
