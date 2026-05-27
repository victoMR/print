import { Router } from 'express';
import {
  createOrderBodySchema,
  estimateBodySchema,
  shippingRatesBodySchema,
} from '../../schemas/api.schema.js';
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

v1CheckoutRouter.post('/orders', async (req, res, next) => {
  try {
    const input = createOrderBodySchema.parse(req.body);
    const data = await checkoutPresenter.createDraftOrderPublic(input);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});
