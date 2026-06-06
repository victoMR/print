import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external dependencies
vi.mock('../db/mrpaps-orders.repository.js', () => ({
  getOrderForPaymentFinalize: vi.fn(),
  tryMarkOrderAsPaid: vi.fn(),
  updateOrderPaymentByPublicId: vi.fn(),
  updateOrderStatus: vi.fn(),
}));
vi.mock('../services/order-confirmation-email.service.js', () => ({
  sendOrderConfirmationEmail: vi.fn(),
}));
vi.mock('../lib/stripe.js', () => ({
  getStripe: vi.fn(),
  isStripeConfigured: vi.fn(),
}));
vi.mock('../lib/order-tracking-code.js', () => ({
  normalizeTrackingCode: vi.fn((code: string) => code),
}));
vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import * as ordersRepo from '../db/mrpaps-orders.repository.js';
import * as emailService from '../services/order-confirmation-email.service.js';
import * as stripeLib from '../lib/stripe.js';
import { finalizeOrderPayment } from '../services/mrpaps-order-payment-finalize.service.js';

const BASE_ORDER = {
  id: 'internal-id',
  public_id: 'ABC-123',
  status: 'pendiente_pago' as const,
  total_mxn: '500.00',
  customer_email: 'customer@example.com',
  payment_status: null,
  stripe_payment_intent_id: 'pi_test_123',
  confirmation_email_sent_at: null,
};

const MOCK_INTENT = {
  id: 'pi_test_123',
  status: 'succeeded',
  amount: 50000, // 500.00 MXN in cents
  metadata: { public_order_id: 'ABC-123' },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('finalizeOrderPayment', () => {
  it('returns early if order is already paid', async () => {
    vi.mocked(ordersRepo.getOrderForPaymentFinalize).mockResolvedValue({
      ...BASE_ORDER,
      payment_status: 'paid',
      confirmation_email_sent_at: '2024-01-01T00:00:00Z',
    });
    vi.mocked(emailService.sendOrderConfirmationEmail).mockResolvedValue(undefined);

    const result = await finalizeOrderPayment('ABC-123');

    expect(result.paymentStatus).toBe('paid');
    expect(ordersRepo.tryMarkOrderAsPaid).not.toHaveBeenCalled();
  });

  it('marks order as paid and sends email on succeeded intent', async () => {
    vi.mocked(ordersRepo.getOrderForPaymentFinalize).mockResolvedValue(BASE_ORDER);
    vi.mocked(stripeLib.isStripeConfigured).mockReturnValue(true);
    vi.mocked(stripeLib.getStripe).mockReturnValue({
      paymentIntents: { retrieve: vi.fn().mockResolvedValue(MOCK_INTENT) },
    } as never);
    vi.mocked(ordersRepo.tryMarkOrderAsPaid).mockResolvedValue(true);
    vi.mocked(ordersRepo.updateOrderStatus).mockResolvedValue({} as never);
    vi.mocked(emailService.sendOrderConfirmationEmail).mockResolvedValue(undefined);
    vi.mocked(ordersRepo.getOrderForPaymentFinalize).mockResolvedValueOnce(BASE_ORDER).mockResolvedValue({
      ...BASE_ORDER,
      payment_status: 'paid',
      confirmation_email_sent_at: '2024-01-01T00:00:00Z',
    });

    const result = await finalizeOrderPayment('ABC-123');

    expect(ordersRepo.tryMarkOrderAsPaid).toHaveBeenCalledWith('ABC-123');
    expect(emailService.sendOrderConfirmationEmail).toHaveBeenCalledWith('ABC-123');
    expect(result.paymentStatus).toBe('paid');
  });

  it('handles race: second caller exits early when CAS fails', async () => {
    vi.mocked(ordersRepo.getOrderForPaymentFinalize).mockResolvedValue(BASE_ORDER);
    vi.mocked(stripeLib.isStripeConfigured).mockReturnValue(true);
    vi.mocked(stripeLib.getStripe).mockReturnValue({
      paymentIntents: { retrieve: vi.fn().mockResolvedValue(MOCK_INTENT) },
    } as never);
    vi.mocked(ordersRepo.tryMarkOrderAsPaid).mockResolvedValue(false); // lost the race
    vi.mocked(emailService.sendOrderConfirmationEmail).mockResolvedValue(undefined);
    vi.mocked(ordersRepo.getOrderForPaymentFinalize).mockResolvedValueOnce(BASE_ORDER).mockResolvedValue({
      ...BASE_ORDER,
      payment_status: 'paid',
      confirmation_email_sent_at: '2024-01-01T00:00:00Z',
    });

    const result = await finalizeOrderPayment('ABC-123');

    expect(ordersRepo.updateOrderStatus).not.toHaveBeenCalled();
    expect(result.paymentStatus).toBe('paid');
  });

  it('returns amount_mismatch when Stripe amount differs', async () => {
    vi.mocked(ordersRepo.getOrderForPaymentFinalize).mockResolvedValue(BASE_ORDER);
    vi.mocked(stripeLib.isStripeConfigured).mockReturnValue(true);
    vi.mocked(stripeLib.getStripe).mockReturnValue({
      paymentIntents: {
        retrieve: vi.fn().mockResolvedValue({ ...MOCK_INTENT, amount: 99999 }),
      },
    } as never);
    vi.mocked(ordersRepo.updateOrderPaymentByPublicId).mockResolvedValue(undefined);

    const result = await finalizeOrderPayment('ABC-123');

    expect(result.paymentStatus).toBe('amount_mismatch');
    expect(ordersRepo.tryMarkOrderAsPaid).not.toHaveBeenCalled();
  });
});
