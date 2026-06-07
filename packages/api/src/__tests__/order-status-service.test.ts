import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db/mrpaps-orders.repository.js', () => ({
  getOrderByPublicId: vi.fn(),
  updateOrderStatus: vi.fn(),
}));
vi.mock('../services/mrpaps-stripe-refund.service.js', () => ({
  refundPaidOrder: vi.fn(),
}));

import * as ordersRepo from '../db/mrpaps-orders.repository.js';
import { refundPaidOrder } from '../services/mrpaps-stripe-refund.service.js';
import { changeOrderStatus } from '../services/mrpaps-order-status.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('changeOrderStatus', () => {
  it('reembolsa en Stripe antes de cancelar un pedido pagado', async () => {
    vi.mocked(ordersRepo.getOrderByPublicId).mockResolvedValue({
      id: 'order-1',
      payment_status: 'paid',
      status: 'pedido',
      items: [],
    } as never);
    vi.mocked(refundPaidOrder).mockResolvedValue({ ok: true, refundId: 're_1' });
    vi.mocked(ordersRepo.updateOrderStatus).mockResolvedValue({ public_id: 'ABC-123' } as never);

    await changeOrderStatus('ABC-123', 'cancelado', {}, { note: 'Cliente pidió cancelar', createdBy: 'admin' });

    expect(refundPaidOrder).toHaveBeenCalledWith('ABC-123', {
      reason: 'admin_cancel',
      note: 'Cliente pidió cancelar',
    });
    expect(ordersRepo.updateOrderStatus).toHaveBeenCalled();
  });

  it('no cancela si el reembolso falla', async () => {
    vi.mocked(ordersRepo.getOrderByPublicId).mockResolvedValue({
      id: 'order-1',
      payment_status: 'paid',
      status: 'pedido',
      items: [],
    } as never);
    vi.mocked(refundPaidOrder).mockResolvedValue({ ok: false, error: 'card_error' });

    await expect(
      changeOrderStatus('ABC-123', 'cancelado', {}, { createdBy: 'admin' }),
    ).rejects.toThrow('No se pudo reembolsar');

    expect(ordersRepo.updateOrderStatus).not.toHaveBeenCalled();
  });

  it('no reembolsa al cancelar pendiente_pago sin pago', async () => {
    vi.mocked(ordersRepo.getOrderByPublicId).mockResolvedValue({
      id: 'order-1',
      payment_status: null,
      status: 'pendiente_pago',
      items: [],
    } as never);
    vi.mocked(ordersRepo.updateOrderStatus).mockResolvedValue({ public_id: 'ABC-123' } as never);

    await changeOrderStatus('ABC-123', 'cancelado', {}, { createdBy: 'admin' });

    expect(refundPaidOrder).not.toHaveBeenCalled();
    expect(ordersRepo.updateOrderStatus).toHaveBeenCalled();
  });
});
