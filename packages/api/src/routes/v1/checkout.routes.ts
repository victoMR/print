import { Router } from 'express';
import {
  createOrderBodySchema,
  estimateBodySchema,
  shippingRatesBodySchema,
} from '../../schemas/api.schema.js';
import { optionalCustomerAuth } from '../../middleware/customer-auth.js';
import { checkoutRateLimit, shippingRateLimit } from '../../middleware/rate-limit.js';
import * as checkoutPresenter from '../../services/checkout-presenter.service.js';
import type { Market } from '../../lib/market.js';

/**
 * Header confiable solo porque el puerto del backend no es accesible
 * públicamente — lo agrega app/api/v1/checkout/orders/route.ts en Next.js
 * tras una consulta de geo-IP fresca (no la cookie cacheada del visitante).
 */
function readVerifiedMarket(value: string | string[] | undefined): Market | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'mx' || raw === 'us' ? raw : null;
}

export const v1CheckoutRouter: Router = Router();

v1CheckoutRouter.post('/shipping-rates', shippingRateLimit, async (req, res, next) => {
  try {
    const input = shippingRatesBodySchema.parse(req.body);
    const data = await checkoutPresenter.getShippingRatesMxn(input);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

v1CheckoutRouter.post('/estimate', shippingRateLimit, async (req, res, next) => {
  try {
    const input = estimateBodySchema.parse(req.body);
    const data = await checkoutPresenter.estimateCostsMxn(input);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

v1CheckoutRouter.post('/orders', checkoutRateLimit, optionalCustomerAuth, async (req, res, next) => {
  try {
    const input = createOrderBodySchema.parse(req.body);
    const verifiedMarket = readVerifiedMarket(req.headers['x-verified-market']);
    const data = await checkoutPresenter.createDraftOrderPublic(input, req.customerUser?.id, verifiedMarket);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

/** Tras pago exitoso en Stripe (cliente o retorno 3DS). Idempotente con el webhook. */
v1CheckoutRouter.post('/orders/:publicOrderId/finalize-payment', checkoutRateLimit, async (req, res, next) => {
  try {
    const publicOrderId = Array.isArray(req.params.publicOrderId)
      ? req.params.publicOrderId[0]
      : req.params.publicOrderId;
    const data = await checkoutPresenter.finalizeOrderPaymentPublic(publicOrderId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});
