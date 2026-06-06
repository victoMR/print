import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────
const constructEvent = vi.fn();
const paymentIntentsRetrieve = vi.fn();

vi.mock('../lib/stripe.js', () => ({
  getStripe: vi.fn(() => ({
    webhooks: { constructEvent },
    paymentIntents: { retrieve: paymentIntentsRetrieve },
  })),
  isStripeConfigured: vi.fn(() => true),
}));
vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../lib/db.js', () => ({
  pool: { query: vi.fn() },
}));
vi.mock('../db/stripe-webhook-events.repository.js', () => ({
  claimStripeWebhookEvent: vi.fn(),
}));
vi.mock('../db/mrpaps-orders.repository.js', () => ({
  updateOrderPaymentByPublicId: vi.fn(),
}));
vi.mock('../services/mrpaps-order-payment-finalize.service.js', () => ({
  finalizeOrderPayment: vi.fn(),
}));

import { pool } from '../lib/db.js';
import { claimStripeWebhookEvent } from '../db/stripe-webhook-events.repository.js';
import { finalizeOrderPayment } from '../services/mrpaps-order-payment-finalize.service.js';
import { handleStripeWebhook } from '../services/mrpaps-payment.service.js';

const _originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

afterAll(() => {
  if (_originalSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
  else process.env.STRIPE_WEBHOOK_SECRET = _originalSecret;
});

const RAW_BODY = Buffer.from('{}');
const SIGNATURE = 'sig_test';

function succeededEvent(id = 'evt_1', publicOrderId = 'MRP-AAAA-BBBB-CCCC') {
  return {
    id,
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_1', metadata: { public_order_id: publicOrderId } } },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('handleStripeWebhook — verificación de firma', () => {
  it('lanza si STRIPE_WEBHOOK_SECRET no está definido', async () => {
    const prev = process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    await expect(handleStripeWebhook(RAW_BODY, SIGNATURE)).rejects.toThrow('STRIPE_WEBHOOK_SECRET');
    process.env.STRIPE_WEBHOOK_SECRET = prev;
  });

  it('lanza si la firma es inválida y nunca reclama el evento', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('signature mismatch');
    });
    await expect(handleStripeWebhook(RAW_BODY, SIGNATURE)).rejects.toThrow('Webhook inválido');
    expect(claimStripeWebhookEvent).not.toHaveBeenCalled();
  });
});

describe('handleStripeWebhook — idempotencia (dedup por event.id)', () => {
  it('procesa el evento la primera vez (claim gana)', async () => {
    constructEvent.mockReturnValue(succeededEvent('evt_unico'));
    vi.mocked(claimStripeWebhookEvent).mockResolvedValue(true);
    vi.mocked(finalizeOrderPayment).mockResolvedValue({
      paymentStatus: 'paid',
      emailSent: true,
      message: 'ok',
    });

    await handleStripeWebhook(RAW_BODY, SIGNATURE);

    expect(claimStripeWebhookEvent).toHaveBeenCalledWith('evt_unico', 'payment_intent.succeeded');
    expect(finalizeOrderPayment).toHaveBeenCalledWith('MRP-AAAA-BBBB-CCCC', expect.any(Object));
  });

  it('ignora un reenvío del mismo evento (claim pierde) y NO finaliza de nuevo', async () => {
    constructEvent.mockReturnValue(succeededEvent('evt_duplicado'));
    vi.mocked(claimStripeWebhookEvent).mockResolvedValue(false); // ya procesado

    await handleStripeWebhook(RAW_BODY, SIGNATURE);

    expect(finalizeOrderPayment).not.toHaveBeenCalled();
  });

  it('procesa exactamente una vez aunque Stripe reenvíe 3 veces', async () => {
    constructEvent.mockReturnValue(succeededEvent('evt_replay'));
    // Primera vez gana, las siguientes pierden.
    vi.mocked(claimStripeWebhookEvent)
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false);
    vi.mocked(finalizeOrderPayment).mockResolvedValue({
      paymentStatus: 'paid',
      emailSent: true,
      message: 'ok',
    });

    await handleStripeWebhook(RAW_BODY, SIGNATURE);
    await handleStripeWebhook(RAW_BODY, SIGNATURE);
    await handleStripeWebhook(RAW_BODY, SIGNATURE);

    expect(finalizeOrderPayment).toHaveBeenCalledOnce();
  });
});

describe('handleStripeWebhook — payment_intent.succeeded', () => {
  it('omite finalizar si falta public_order_id en metadata', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_sin_meta',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_x', metadata: {} } },
    });
    vi.mocked(claimStripeWebhookEvent).mockResolvedValue(true);

    await handleStripeWebhook(RAW_BODY, SIGNATURE);

    expect(finalizeOrderPayment).not.toHaveBeenCalled();
  });

  it('no propaga el error si finalizeOrderPayment falla (webhook responde igual)', async () => {
    constructEvent.mockReturnValue(succeededEvent('evt_err'));
    vi.mocked(claimStripeWebhookEvent).mockResolvedValue(true);
    vi.mocked(finalizeOrderPayment).mockRejectedValue(new Error('DB caída'));

    await expect(handleStripeWebhook(RAW_BODY, SIGNATURE)).resolves.toBeUndefined();
  });
});

describe('handleStripeWebhook — payment_intent.payment_failed', () => {
  it('marca como failed solo si el pedido no está ya pagado', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_fail',
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_f', metadata: { public_order_id: 'MRP-ZZZZ-YYYY-XXXX' } } },
    });
    vi.mocked(claimStripeWebhookEvent).mockResolvedValue(true);
    vi.mocked(pool.query).mockResolvedValue({ rowCount: 1 } as never);

    await handleStripeWebhook(RAW_BODY, SIGNATURE);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("payment_status = 'failed'"),
      ['MRP-ZZZZ-YYYY-XXXX'],
    );
  });
});
