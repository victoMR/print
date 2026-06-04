import { getStripe, isStripeConfigured } from '../lib/stripe.js';
import { logger } from '../lib/logger.js';
import {
  getOrderPaymentSnapshot,
  updateOrderPaymentByPublicId,
} from '../db/mrpaps-orders.repository.js';
import { sendOrderConfirmationEmail } from './order-confirmation-email.service.js';
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

  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'mxn',
    automatic_payment_methods: { enabled: true },
    metadata: {
      order_id: input.orderId,
      public_order_id: input.publicOrderId,
    },
    receipt_email: input.customerEmail,
  });

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

    const order = await getOrderPaymentSnapshot(publicOrderId);
    if (!order) {
      logger.error({ publicOrderId }, 'Pedido no encontrado al procesar webhook');
      return;
    }

    if (order.payment_status === 'paid') {
      logger.info({ publicOrderId }, 'Webhook duplicado — pedido ya pagado; verificando correo pendiente');
      await sendOrderConfirmationEmail(publicOrderId);
      return;
    }

    const expectedCents = Math.round(Number(order.total_mxn) * 100);
    if (intent.amount !== expectedCents) {
      logger.error(
        { publicOrderId, intentId: intent.id, intentAmount: intent.amount, expectedCents },
        'FRAUDE DETECTADO: monto cobrado no coincide con total del pedido',
      );
      await updateOrderPaymentByPublicId(publicOrderId, { payment_status: 'amount_mismatch' });
      return;
    }

    try {
      await updateOrderPaymentByPublicId(publicOrderId, { payment_status: 'paid' });
      logger.info({ publicOrderId, amountMxn: order.total_mxn }, 'Pedido marcado como pagado');
      logger.info({ publicOrderId }, 'Iniciando correo de confirmación de compra');
      await sendOrderConfirmationEmail(publicOrderId);
    } catch (error) {
      logger.error({ publicOrderId, error }, 'Error al marcar pedido como pagado');
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const publicOrderId = intent.metadata.public_order_id;
    if (publicOrderId) {
      await updateOrderPaymentByPublicId(publicOrderId, { payment_status: 'failed' });
      logger.info({ publicOrderId, intentId: intent.id }, 'Pago fallido registrado');
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
