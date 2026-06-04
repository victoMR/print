import type Stripe from 'stripe';
import { getStripe, isStripeConfigured } from '../lib/stripe.js';
import { logger } from '../lib/logger.js';
import { normalizeTrackingCode } from '../lib/order-tracking-code.js';
import {
  getOrderForPaymentFinalize,
  updateOrderPaymentByPublicId,
} from '../db/mrpaps-orders.repository.js';
import { sendOrderConfirmationEmail } from './order-confirmation-email.service.js';
import { NotFoundError } from '../types/errors.js';

export type FinalizePaymentResult = {
  paymentStatus: string;
  emailSent: boolean;
  message: string;
};

/**
 * Marca el pedido como pagado (si Stripe confirma el PaymentIntent) y envía el correo de confirmación.
 * Idempotente: seguro llamar desde webhook y desde el cliente tras confirmPayment.
 */
export async function finalizeOrderPayment(
  rawPublicId: string,
  options?: { paymentIntent?: Stripe.PaymentIntent },
): Promise<FinalizePaymentResult> {
  const publicId = normalizeTrackingCode(rawPublicId);
  if (!publicId) {
    throw new NotFoundError('Código de pedido no válido');
  }

  const order = await getOrderForPaymentFinalize(publicId);
  if (!order) {
    throw new NotFoundError('Pedido no encontrado');
  }

  logger.info(
    {
      publicOrderId: publicId,
      paymentStatus: order.payment_status,
      hasIntent: Boolean(order.stripe_payment_intent_id),
      emailAlreadySent: Boolean(order.confirmation_email_sent_at),
      source: options?.paymentIntent ? 'webhook' : 'client',
    },
    'Finalizar pago: inicio',
  );

  if (order.payment_status === 'paid') {
    try {
      await sendOrderConfirmationEmail(publicId);
    } catch (emailErr) {
      logger.error({ publicOrderId: publicId, emailErr }, 'Finalizar pago: falló correo en pedido ya pagado');
    }
    const refreshed = await getOrderForPaymentFinalize(publicId);
    return {
      paymentStatus: 'paid',
      emailSent: Boolean(refreshed?.confirmation_email_sent_at),
      message: refreshed?.confirmation_email_sent_at
        ? 'Pedido ya pagado; correo enviado o ya estaba enviado'
        : 'Pedido ya pagado; el correo no se pudo registrar como enviado (revisa SMTP/logs)',
    };
  }

  if (!isStripeConfigured()) {
    return {
      paymentStatus: order.payment_status ?? 'pending',
      emailSent: false,
      message: 'Stripe no configurado',
    };
  }

  const intentId = order.stripe_payment_intent_id;
  if (!intentId && !options?.paymentIntent) {
    return {
      paymentStatus: order.payment_status ?? 'pending',
      emailSent: false,
      message: 'Sin PaymentIntent asociado; completa el pago en checkout',
    };
  }

  const stripe = getStripe();
  const intent =
    options?.paymentIntent ??
    (await stripe.paymentIntents.retrieve(intentId!));

  if (intent.status !== 'succeeded') {
    logger.info(
      { publicOrderId: publicId, intentStatus: intent.status },
      'Finalizar pago: Stripe aún no marca succeeded',
    );
    return {
      paymentStatus: order.payment_status ?? 'pending',
      emailSent: false,
      message: `Pago en Stripe: ${intent.status}`,
    };
  }

  const expectedCents = Math.round(Number(order.total_mxn) * 100);
  if (intent.amount !== expectedCents) {
    logger.error(
      { publicOrderId: publicId, intentAmount: intent.amount, expectedCents },
      'Finalizar pago: monto no coincide',
    );
    await updateOrderPaymentByPublicId(publicId, { payment_status: 'amount_mismatch' });
    return {
      paymentStatus: 'amount_mismatch',
      emailSent: false,
      message: 'Monto del pago no coincide con el pedido',
    };
  }

  await updateOrderPaymentByPublicId(publicId, { payment_status: 'paid' });
  logger.info({ publicOrderId: publicId }, 'Finalizar pago: marcado como paid');

  try {
    await sendOrderConfirmationEmail(publicId);
  } catch (emailErr) {
    logger.error({ publicOrderId: publicId, emailErr }, 'Finalizar pago: pago OK pero correo falló');
    return {
      paymentStatus: 'paid',
      emailSent: false,
      message: 'Pago confirmado; error al enviar correo (revisa logs SMTP)',
    };
  }

  const refreshed = await getOrderForPaymentFinalize(publicId);
  return {
    paymentStatus: 'paid',
    emailSent: Boolean(refreshed?.confirmation_email_sent_at),
    message: refreshed?.confirmation_email_sent_at
      ? 'Pago confirmado y correo enviado'
      : 'Pago confirmado; revisa logs si el correo no llegó',
  };
}
