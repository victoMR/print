import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PoolClient } from 'pg';

// ── Mock DB helpers + products repo ───────────────────────────────────────────
const queryOneMock = vi.fn();
const queryMock = vi.fn();

vi.mock('../lib/db-helper.js', () => ({
  query: (...args: unknown[]) => queryMock(...args),
  queryOne: (...args: unknown[]) => queryOneMock(...args),
  queryRequired: vi.fn(),
  buildUpdateSet: (patch: Record<string, unknown>) => {
    const keys = Object.keys(patch);
    return {
      clause: keys.map((k, i) => `${k} = $${i + 2}`).join(', '),
      values: keys.map((k) => patch[k]),
    };
  },
  withTransaction: async (fn: (client: PoolClient) => Promise<unknown>) => fn(txClient),
}));

vi.mock('../lib/db.js', () => ({ pool: { query: vi.fn(), connect: vi.fn() } }));

const releaseVariantStockTx = vi.fn();
const reserveVariantStockTx = vi.fn();
vi.mock('../db/mrpaps-products.repository.js', () => ({
  releaseVariantStockTx: (...args: unknown[]) => releaseVariantStockTx(...args),
  reserveVariantStockTx: (...args: unknown[]) => reserveVariantStockTx(...args),
  assertVariantStockAvailableTx: vi.fn(),
}));

vi.mock('../lib/order-tracking-code.js', () => ({
  normalizeTrackingCode: (code: string) => code,
  generateTrackingCode: () => 'ABC-123',
}));

const txClient = {
  query: vi.fn(async () => ({ rows: [{ id: 'order-1', status: 'cancelado' }] })),
} as unknown as PoolClient;

const { updateOrderStatus } = await import('../db/mrpaps-orders.repository.js');

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    public_id: 'ABC-123',
    status: 'pedido',
    payment_status: 'paid',
    shipped_at: null,
    items: [
      { id: 'item-1', variant_id: 'variant-1', quantity: 2, inventory_reserved_qty: 2 },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (txClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
    rows: [{ id: 'order-1', status: 'cancelado' }],
  });
});

describe('updateOrderStatus — guards de pago', () => {
  it('rechaza transición de un pedido NO pagado (excepto cancelar)', async () => {
    queryOneMock.mockResolvedValue(makeOrder({ status: 'pedido', payment_status: 'pending' }));
    queryMock.mockResolvedValue([
      { id: 'item-1', variant_id: 'variant-1', quantity: 2, inventory_reserved_qty: 0 },
    ]);

    await expect(
      updateOrderStatus('ABC-123', 'solicitado_imprenta', {}, {}),
    ).rejects.toThrow('Solo se pueden actualizar pedidos pagados');
  });

  it('permite la transición de sistema pendiente_pago → pedido cuando ya está pagado', async () => {
    queryOneMock.mockResolvedValue(makeOrder({ status: 'pendiente_pago', payment_status: 'paid' }));
    queryMock.mockResolvedValue([
      { id: 'item-1', variant_id: 'variant-1', quantity: 2, inventory_reserved_qty: 2 },
    ]);

    await expect(
      updateOrderStatus('ABC-123', 'pedido', {}, { createdBy: 'system' }),
    ).resolves.toBeTruthy();
    expect(releaseVariantStockTx).not.toHaveBeenCalled();
  });

  it('permite cancelar tras reembolso (payment_status refunded)', async () => {
    queryOneMock.mockResolvedValue(makeOrder({ status: 'pendiente_pago', payment_status: 'refunded' }));
    queryMock.mockResolvedValue([
      { id: 'item-1', variant_id: 'variant-1', quantity: 2, inventory_reserved_qty: 0 },
    ]);

    await expect(updateOrderStatus('ABC-123', 'cancelado', {}, { createdBy: 'system' })).resolves.toBeTruthy();
  });

  it('permite cancelar un pendiente_pago abandonado (sin liberar stock)', async () => {
    queryOneMock.mockResolvedValue(makeOrder({ status: 'pendiente_pago', payment_status: null }));
    queryMock.mockResolvedValue([
      { id: 'item-1', variant_id: 'variant-1', quantity: 2, inventory_reserved_qty: 0 },
    ]);

    await expect(updateOrderStatus('ABC-123', 'cancelado', {}, {})).resolves.toBeTruthy();
    expect(releaseVariantStockTx).not.toHaveBeenCalled();
  });
});

describe('updateOrderStatus — devolución de stock al cancelar', () => {
  it('devuelve stock al cancelar un pedido PAGADO (pedido → cancelado)', async () => {
    queryOneMock.mockResolvedValue(makeOrder({ status: 'pedido', payment_status: 'paid' }));
    queryMock.mockResolvedValue([
      { id: 'item-1', variant_id: 'variant-1', quantity: 2, inventory_reserved_qty: 2 },
    ]);

    await updateOrderStatus('ABC-123', 'cancelado', {}, { createdBy: 'admin' });

    expect(releaseVariantStockTx).toHaveBeenCalledWith(txClient, 'variant-1', 2);
    // Idempotencia: pone inventory_reserved_qty en 0
    expect(txClient.query).toHaveBeenCalledWith(
      expect.stringContaining('SET inventory_reserved_qty = 0'),
      ['order-1'],
    );
  });

  it('devuelve stock al cancelar desde recibido_imprenta', async () => {
    queryOneMock.mockResolvedValue(makeOrder({ status: 'recibido_imprenta', payment_status: 'paid' }));
    queryMock.mockResolvedValue([
      { id: 'item-1', variant_id: 'variant-1', quantity: 3, inventory_reserved_qty: 3 },
    ]);

    await updateOrderStatus('ABC-123', 'cancelado', {}, { createdBy: 'admin' });

    expect(releaseVariantStockTx).toHaveBeenCalledWith(txClient, 'variant-1', 3);
  });

  it('no libera para items POD (inventory_reserved_qty = 0)', async () => {
    queryOneMock.mockResolvedValue(makeOrder({ status: 'pedido', payment_status: 'paid' }));
    queryMock.mockResolvedValue([
      { id: 'item-1', variant_id: 'variant-1', quantity: 2, inventory_reserved_qty: 0 },
    ]);

    await updateOrderStatus('ABC-123', 'cancelado', {}, { createdBy: 'admin' });

    expect(releaseVariantStockTx).not.toHaveBeenCalled();
  });

  it('rechaza transición inválida (enviado es terminal)', async () => {
    queryOneMock.mockResolvedValue(makeOrder({ status: 'enviado', payment_status: 'paid' }));
    queryMock.mockResolvedValue([
      { id: 'item-1', variant_id: 'variant-1', quantity: 2, inventory_reserved_qty: 2 },
    ]);

    await expect(
      updateOrderStatus('ABC-123', 'cancelado', {}, {}),
    ).rejects.toThrow('Transición de estado inválida');
  });
});
