import { Router } from 'express';
import * as checkoutPresenter from '../../services/checkout-presenter.service.js';
import { trackGuestOrder } from '../../services/mrpaps-order-tracking.service.js';
import { guestOrderQuerySchema, trackOrderBodySchema } from '../../schemas/order-tracking.schema.js';
import { authRateLimit } from '../../middleware/rate-limit.js';

export const v1OrdersRouter: Router = Router();

v1OrdersRouter.post('/track', authRateLimit, async (req, res, next) => {
  try {
    const body = trackOrderBodySchema.parse(req.body);
    const data = await trackGuestOrder(body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

v1OrdersRouter.get('/:trackingCode', authRateLimit, async (req, res, next) => {
  try {
    const rawEmail = Array.isArray(req.query['email']) ? req.query['email'][0] : String(req.query['email'] ?? '');
    const { email } = guestOrderQuerySchema.parse({ email: rawEmail });
    const trackingCode = String(req.params['trackingCode'] ?? '');
    const data = await checkoutPresenter.getPublicOrder(trackingCode, email);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});
