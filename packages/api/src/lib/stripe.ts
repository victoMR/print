import Stripe from 'stripe';
import { logger } from './logger.js';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY no definida');
    _stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' });
  }
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/**
 * Monto real liquidado en MXN y tipo de cambio aplicado por Stripe, leídos de
 * la balance transaction del cargo — nunca estimados con un tipo de cambio
 * propio. Solo distinto del monto cobrado cuando currency='usd' y la cuenta
 * liquida en MXN; para cargos ya en MXN esto es un no-op (mismo monto, fx=1).
 */
export async function getStripeSettlementInfo(
  intent: Stripe.PaymentIntent,
): Promise<{ amountMxn: number; fxRate: number } | null> {
  const chargeId =
    typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge?.id;
  if (!chargeId) return null;

  try {
    const stripe = getStripe();
    const charge = await stripe.charges.retrieve(chargeId, { expand: ['balance_transaction'] });
    const balanceTransaction = charge.balance_transaction;
    if (!balanceTransaction || typeof balanceTransaction === 'string') return null;
    if (balanceTransaction.currency !== 'mxn') return null;

    return {
      amountMxn: balanceTransaction.amount / 100,
      fxRate: balanceTransaction.exchange_rate ?? 1,
    };
  } catch (err) {
    logger.warn({ err, chargeId }, 'No se pudo leer la balance transaction de Stripe');
    return null;
  }
}
