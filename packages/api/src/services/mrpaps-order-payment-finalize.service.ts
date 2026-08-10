import type Stripe from 'stripe';
import { getStripe, getStripeSettlementInfo, isStripeConfigured } from '../lib/stripe.js';
import { logger } from '../lib/logger.js';
import { normalizeTrackingCode } from '../lib/order-tracking-code.js';
import {
  commitOrderInventoryOnPaid,
  getOrderForPaymentFinalize,
  tryMarkOrderAsPaid,
  updateOrderPaymentByPublicId,
  updateOrderStatus,
} from '../db/mrpaps-orders.repository.js';
import { sendOrderConfirmationEmail } from './order-confirmation-email.service.js';
import { refundPaidOrder } from './mrpaps-stripe-refund.service.js';
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
    throw new NotFoundError('Código de pedido no válido', 'INVALID_TRACKING_CODE');
  }

  const order = await getOrderForPaymentFinalize(publicId);
  if (!order) {
    throw new NotFoundError('Pedido no encontrado', 'ORDER_NOT_FOUND');
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

  if (order.payment_status === 'refunded') {
    // Un pedido reembolsado nunca debe reprocesarse: el PaymentIntent de Stripe
    // sigue en estado 'succeeded' tras un reembolso, así que si esta función
    // continuara de largo terminaría regresando payment_status a 'paid'.
    return {
      paymentStatus: 'refunded',
      emailSent: false,
      message: 'Pedido reembolsado; no se reprocesa el pago',
    };
  }

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

  const expectedCurrency = order.currency === 'USD' ? 'usd' : 'mxn';
  if (intent.currency !== expectedCurrency) {
    logger.error(
      { publicOrderId: publicId, intentCurrency: intent.currency, expectedCurrency },
      'Finalizar pago: moneda no coincide',
    );
    // 'amount_mismatch' no es un valor válido de payment_status (CHECK constraint
    // solo permite pending/paid/failed/refunded); se persiste como 'failed' y se
    // devuelve el detalle específico solo en la respuesta de esta función.
    await updateOrderPaymentByPublicId(publicId, { payment_status: 'failed' });
    return {
      paymentStatus: 'amount_mismatch',
      emailSent: false,
      message: 'Moneda del pago no coincide con el pedido',
    };
  }

  const expectedAmount = order.currency === 'USD' ? order.total_usd : order.total_mxn;
  const expectedCents = Math.round(Number(expectedAmount) * 100);
  if (intent.amount !== expectedCents) {
    logger.error(
      { publicOrderId: publicId, intentAmount: intent.amount, expectedCents },
      'Finalizar pago: monto no coincide',
    );
    await updateOrderPaymentByPublicId(publicId, { payment_status: 'failed' });
    return {
      paymentStatus: 'amount_mismatch',
      emailSent: false,
      message: 'Monto del pago no coincide con el pedido',
    };
  }

  // Atomic CAS: only the first caller wins the race; the other exits early.
  const won = await tryMarkOrderAsPaid(publicId);
  if (!won) {
    logger.info({ publicOrderId: publicId }, 'Finalizar pago: otro proceso ya marcó como paid');
    try {
      await sendOrderConfirmationEmail(publicId);
    } catch { /* already handled by the winning process */ }
    const refreshed = await getOrderForPaymentFinalize(publicId);
    return {
      paymentStatus: 'paid',
      emailSent: Boolean(refreshed?.confirmation_email_sent_at),
      message: 'Pedido ya pagado; correo enviado o ya estaba enviado',
    };
  }

  logger.info({ publicOrderId: publicId }, 'Finalizar pago: marcado como paid');

  // Best-effort: registra el monto real liquidado en MXN (dato de Stripe, no
  // estimado) para contabilidad/CFDI. Nunca bloquea el flujo de pago.
  try {
    const settlement = await getStripeSettlementInfo(intent);
    if (settlement) {
      await updateOrderPaymentByPublicId(publicId, {
        payment_status: 'paid',
        stripe_settlement_amount_mxn: settlement.amountMxn,
        stripe_fx_rate: settlement.fxRate,
      });
    }
  } catch (settlementErr) {
    logger.warn({ publicOrderId: publicId, settlementErr }, 'No se pudo registrar liquidación de Stripe');
  }

  const inventory = await commitOrderInventoryOnPaid(publicId);
  if (!inventory.ok) {
    logger.error(
      { publicOrderId: publicId, reason: inventory.reason },
      'Finalizar pago: inventario insuficiente tras cobro — reembolso automático',
    );

    const refund = await refundPaidOrder(publicId, {
      reason: 'stock_unavailable',
      note: inventory.reason,
    });

    if (!refund.ok) {
      logger.error(
        { publicOrderId: publicId, refundError: refund.error, inventoryReason: inventory.reason },
        'CRÍTICO: cobro sin stock y reembolso falló — intervención manual',
      );
    }

    await updateOrderStatus(
      publicId,
      'cancelado',
      {
        internal_notes: `Sin stock tras pago (${inventory.reason})${
          refund.ok ? '. Reembolso automático en Stripe.' : `. Reembolso falló: ${refund.error}`
        }`,
      },
      {
        note: refund.ok
          ? 'Cancelado: sin stock. Reembolso automático.'
          : 'Cancelado: sin stock. Reembolso pendiente (falló en Stripe).',
        createdBy: 'system',
      },
    );

    return {
      paymentStatus: refund.ok ? 'refunded' : 'paid',
      emailSent: false,
      message: refund.ok
        ? 'El producto ya no tiene stock disponible. Tu pago fue reembolsado automáticamente.'
        : 'El producto ya no tiene stock disponible. Contacta a soporte para tu reembolso.',
    };
  }

  const orderAfterPay = await getOrderForPaymentFinalize(publicId);
  if (orderAfterPay?.status === 'pendiente_pago') {
    await updateOrderStatus(
      publicId,
      'pedido',
      {},
      { note: 'Pago confirmado en Stripe', createdBy: 'system' },
    );
    logger.info({ publicOrderId: publicId }, 'Finalizar pago: estado → pedido recibido');
  }

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
