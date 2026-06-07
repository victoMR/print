import { describe, it, expect, vi, beforeEach } from 'vitest';
import Stripe from 'stripe';

vi.mock('../lib/stripe.js', () => ({
  isStripeConfigured: vi.fn(() => true),
  getStripe: vi.fn(),
}));
vi.mock('../lib/db-helper.js', () => ({
  queryOne: vi.fn(),
}));
vi.mock('../db/mrpaps-orders.repository.js', () => ({
  updateOrderPaymentByPublicId: vi.fn(),
}));
vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock('../lib/order-tracking-code.js', () => ({
  normalizeTrackingCode: (code: string) => code,
}));

import { getStripe } from '../lib/stripe.js';
import { queryOne } from '../lib/db-helper.js';
import { updateOrderPaymentByPublicId } from '../db/mrpaps-orders.repository.js';
import { refundPaidOrder } from '../services/mrpaps-stripe-refund.service.js';

const refundsCreate = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getStripe).mockReturnValue({
    refunds: { create: refundsCreate },
  } as never);
});

describe('refundPaidOrder', () => {
  it('reembolsa un pedido pagado y actualiza payment_status', async () => {
    vi.mocked(queryOne).mockResolvedValue({
      stripe_payment_intent_id: 'pi_test',
      payment_status: 'paid',
    });
    refundsCreate.mockResolvedValue({ id: 're_test' });

    const result = await refundPaidOrder('ABC-123', { reason: 'admin_cancel' });

    expect(result).toEqual({ ok: true, refundId: 're_test' });
    expect(refundsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: 'pi_test' }),
      { idempotencyKey: 'refund-ABC-123' },
    );
    expect(updateOrderPaymentByPublicId).toHaveBeenCalledWith('ABC-123', { payment_status: 'refunded' });
  });

  it('es idempotente si ya está refunded en BD', async () => {
    vi.mocked(queryOne).mockResolvedValue({
      stripe_payment_intent_id: 'pi_test',
      payment_status: 'refunded',
    });

    const result = await refundPaidOrder('ABC-123', { reason: 'admin_cancel' });

    expect(result).toEqual({ ok: true, refundId: 'already', alreadyRefunded: true });
    expect(refundsCreate).not.toHaveBeenCalled();
  });

  it('rechaza si el pedido no está pagado', async () => {
    vi.mocked(queryOne).mockResolvedValue({
      stripe_payment_intent_id: 'pi_test',
      payment_status: 'pending',
    });

    const result = await refundPaidOrder('ABC-123', { reason: 'stock_unavailable' });

    expect(result).toEqual({ ok: false, error: 'not_paid' });
  });

  it('marca refunded si Stripe indica que ya fue reembolsado', async () => {
    vi.mocked(queryOne).mockResolvedValue({
      stripe_payment_intent_id: 'pi_test',
      payment_status: 'paid',
    });
    const err = new Stripe.errors.StripeInvalidRequestError({
      type: 'invalid_request_error',
      code: 'charge_already_refunded',
      message: 'already refunded',
    });
    refundsCreate.mockRejectedValue(err);

    const result = await refundPaidOrder('ABC-123', { reason: 'stock_unavailable' });

    expect(result).toEqual({ ok: true, refundId: 'already', alreadyRefunded: true });
    expect(updateOrderPaymentByPublicId).toHaveBeenCalledWith('ABC-123', { payment_status: 'refunded' });
  });
});
