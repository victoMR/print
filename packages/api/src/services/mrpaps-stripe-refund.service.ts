import Stripe from 'stripe';
import { getStripe, isStripeConfigured } from '../lib/stripe.js';
import { logger } from '../lib/logger.js';
import { normalizeTrackingCode } from '../lib/order-tracking-code.js';
import { queryOne } from '../lib/db-helper.js';
import { updateOrderPaymentByPublicId } from '../db/mrpaps-orders.repository.js';

export type RefundReason = 'admin_cancel' | 'stock_unavailable';

export type RefundOrderResult =
  | { ok: true; refundId: string; alreadyRefunded?: boolean }
  | { ok: false; error: string };

function isAlreadyRefundedError(err: unknown): boolean {
  if (!(err instanceof Stripe.errors.StripeError)) return false;
  const code = err.code ?? '';
  return (
    code === 'charge_already_refunded' ||
    (code === 'payment_intent_unexpected_state' && err.message.includes('refunded'))
  );
}

/**
 * Reembolso total vía Stripe PaymentIntent. Idempotente si el pedido ya está `refunded`.
 */
export async function refundPaidOrder(
  rawPublicId: string,
  options: { reason: RefundReason; note?: string },
): Promise<RefundOrderResult> {
  const publicId = normalizeTrackingCode(rawPublicId);
  if (!publicId) return { ok: false, error: 'invalid_id' };

  const order = await queryOne<{
    stripe_payment_intent_id: string | null;
    payment_status: string | null;
  }>(
    `SELECT stripe_payment_intent_id, payment_status
     FROM mrpaps_orders WHERE public_id = $1`,
    [publicId],
  );
  if (!order) return { ok: false, error: 'not_found' };

  if (order.payment_status === 'refunded') {
    return { ok: true, refundId: 'already', alreadyRefunded: true };
  }

  if (order.payment_status !== 'paid') {
    return { ok: false, error: 'not_paid' };
  }

  if (!isStripeConfigured()) {
    return { ok: false, error: 'stripe_not_configured' };
  }

  const intentId = order.stripe_payment_intent_id;
  if (!intentId) return { ok: false, error: 'no_payment_intent' };

  const stripe = getStripe();

  try {
    const refund = await stripe.refunds.create(
      {
        payment_intent: intentId,
        reason: 'requested_by_customer',
        metadata: {
          public_order_id: publicId,
          refund_reason: options.reason,
          ...(options.note ? { note: options.note.slice(0, 500) } : {}),
        },
      },
      { idempotencyKey: `refund-${publicId}` },
    );

    await updateOrderPaymentByPublicId(publicId, { payment_status: 'refunded' });

    logger.info(
      { publicOrderId: publicId, refundId: refund.id, reason: options.reason },
      'Reembolso Stripe completado',
    );
    return { ok: true, refundId: refund.id };
  } catch (err) {
    if (isAlreadyRefundedError(err)) {
      await updateOrderPaymentByPublicId(publicId, { payment_status: 'refunded' });
      logger.info({ publicOrderId: publicId, reason: options.reason }, 'Reembolso ya existía en Stripe');
      return { ok: true, refundId: 'already', alreadyRefunded: true };
    }

    logger.error(
      { publicOrderId: publicId, reason: options.reason, err },
      'Reembolso Stripe falló',
    );
    return { ok: false, error: err instanceof Error ? err.message : 'refund_failed' };
  }
}
