import { supabase } from '../lib/supabase.js';
import { getStripe, isStripeConfigured } from '../lib/stripe.js';
import { logger } from '../lib/logger.js';
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

  await supabase
    .from('mrpaps_orders')
    .update({
      stripe_payment_intent_id: intent.id,
      payment_status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('public_id', input.publicOrderId);

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

    // Verificar que el monto cobrado coincide con el total del pedido en DB
    const { data: order, error: fetchError } = await supabase
      .from('mrpaps_orders')
      .select('id, total_mxn, payment_status')
      .eq('public_id', publicOrderId)
      .maybeSingle();

    if (fetchError || !order) {
      logger.error({ publicOrderId, fetchError }, 'Pedido no encontrado al procesar webhook');
      return;
    }

    // Idempotencia: si ya está pagado, no volver a procesar
    if (order.payment_status === 'paid') {
      logger.info({ publicOrderId }, 'Webhook duplicado ignorado — pedido ya pagado');
      return;
    }

    const expectedCents = Math.round(Number(order.total_mxn) * 100);
    if (intent.amount !== expectedCents) {
      logger.error(
        { publicOrderId, intentId: intent.id, intentAmount: intent.amount, expectedCents },
        'FRAUDE DETECTADO: monto cobrado no coincide con total del pedido',
      );
      // No marcar como pagado — requiere revisión manual
      await supabase
        .from('mrpaps_orders')
        .update({ payment_status: 'amount_mismatch', updated_at: new Date().toISOString() })
        .eq('public_id', publicOrderId);
      return;
    }

    const { error } = await supabase
      .from('mrpaps_orders')
      .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
      .eq('public_id', publicOrderId);

    if (error) {
      logger.error({ publicOrderId, error }, 'Error al marcar pedido como pagado');
    } else {
      logger.info({ publicOrderId, amountMxn: order.total_mxn }, 'Pedido marcado como pagado');
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const publicOrderId = intent.metadata.public_order_id;
    if (publicOrderId) {
      await supabase
        .from('mrpaps_orders')
        .update({ payment_status: 'failed', updated_at: new Date().toISOString() })
        .eq('public_id', publicOrderId);
      logger.info({ publicOrderId, intentId: intent.id }, 'Pago fallido registrado');
    }
  }

  if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object as Stripe.Dispute;
    logger.warn(
      { disputeId: dispute.id, chargeId: dispute.charge, amount: dispute.amount, reason: dispute.reason },
      'DISPUTA/CHARGEBACK recibido — revisar manualmente',
    );
  }
}
