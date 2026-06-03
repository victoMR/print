import { Router } from 'express';
import * as checkoutPresenter from '../../services/checkout-presenter.service.js';
import { trackGuestOrder } from '../../services/mrpaps-order-tracking.service.js';
import { guestOrderQuerySchema, trackOrderBodySchema } from '../../schemas/order-tracking.schema.js';

export const v1OrdersRouter: Router = Router();

v1OrdersRouter.post('/track', async (req, res, next) => {
  try {
    const body = trackOrderBodySchema.parse(req.body);
    const data = await trackGuestOrder(body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

v1OrdersRouter.get('/:trackingCode', async (req, res, next) => {
  try {
    const { email } = guestOrderQuerySchema.parse(req.query);
    const data = await checkoutPresenter.getPublicOrder(req.params.trackingCode, email);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});
