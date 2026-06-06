import { Router } from 'express';
import {
  createOrderBodySchema,
  estimateBodySchema,
  shippingRatesBodySchema,
} from '../../schemas/api.schema.js';
import { optionalCustomerAuth } from '../../middleware/customer-auth.js';
import { checkoutRateLimit } from '../../middleware/rate-limit.js';
import * as checkoutPresenter from '../../services/checkout-presenter.service.js';

export const v1CheckoutRouter: Router = Router();

v1CheckoutRouter.post('/shipping-rates', async (req, res, next) => {
  try {
    const input = shippingRatesBodySchema.parse(req.body);
    const data = await checkoutPresenter.getShippingRatesMxn(input);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

v1CheckoutRouter.post('/estimate', async (req, res, next) => {
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
    const data = await checkoutPresenter.createDraftOrderPublic(input, req.customerUser?.id);
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
