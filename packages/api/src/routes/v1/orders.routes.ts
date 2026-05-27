import { Router } from 'express';
import * as checkoutPresenter from '../../services/checkout-presenter.service.js';

export const v1OrdersRouter: Router = Router();

v1OrdersRouter.get('/:internalOrderId', async (req, res, next) => {
  try {
    const data = await checkoutPresenter.getPublicOrder(req.params.internalOrderId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});
