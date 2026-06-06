import { getStripe, isStripeConfigured } from '../lib/stripe.js';
import { logger } from '../lib/logger.js';
import { pool } from '../lib/db.js';
import { updateOrderPaymentByPublicId } from '../db/mrpaps-orders.repository.js';
import { finalizeOrderPayment } from './mrpaps-order-payment-finalize.service.js';
import type Stripe from 'stripe';

export { isStripeConfigured };

export async function createPaymentIntent(input: {
  amountMxn: number;
  orderId: string;
  publicOrderId: string;
  customerEmail?: string;
}): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const stripe = getStripe();
  const amountCents = Math.round(input.amountMxn * 100);

  const intent = await stripe.paymentIntents.create(
    {
      amount: amountCents,
      currency: 'mxn',
      automatic_payment_methods: { enabled: true },
      metadata: {
        order_id: input.orderId,
        public_order_id: input.publicOrderId,
      },
      receipt_email: input.customerEmail,
    },
    { idempotencyKey: `pi-${input.publicOrderId}` },
  );

  await updateOrderPaymentByPublicId(input.publicOrderId, {
    stripe_payment_intent_id: intent.id,
    payment_status: 'pending',
  });

  return { clientSecret: intent.client_secret!, paymentIntentId: intent.id };
}

export async function handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET no definido');

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    throw new Error(`Webhook inválido: ${err instanceof Error ? err.message : String(err)}`);
  }

  logger.info({ type: event.type }, 'Stripe webhook recibido');

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const publicOrderId = intent.metadata.public_order_id;

    if (!publicOrderId) {
      logger.warn({ intentId: intent.id }, 'PaymentIntent sin public_order_id en metadata');
      return;
    }

    try {
      const result = await finalizeOrderPayment(publicOrderId, { paymentIntent: intent });
      logger.info({ publicOrderId, result }, 'Webhook payment_intent.succeeded procesado');
    } catch (error) {
      logger.error({ publicOrderId, error }, 'Error al finalizar pago desde webhook');
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const publicOrderId = intent.metadata.public_order_id;
    if (publicOrderId) {
      // Guard: never downgrade an already-paid order (Stripe event delivery is unordered).
      const result = await pool.query(
        `UPDATE mrpaps_orders
         SET payment_status = 'failed', updated_at = NOW()
         WHERE public_id = $1 AND (payment_status IS NULL OR payment_status NOT IN ('paid'))`,
        [publicOrderId],
      );
      if ((result.rowCount ?? 0) > 0) {
        logger.info({ publicOrderId, intentId: intent.id }, 'Pago fallido registrado');
      } else {
        logger.warn({ publicOrderId, intentId: intent.id }, 'payment_failed ignorado — pedido ya pagado');
      }
    }
  }

  if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object as Stripe.Dispute;
    logger.warn(
      {
        disputeId: dispute.id,
        chargeId: dispute.charge,
        amount: dispute.amount,
        reason: dispute.reason,
      },
      'DISPUTA/CHARGEBACK recibido — revisar manualmente',
    );
  }
}
