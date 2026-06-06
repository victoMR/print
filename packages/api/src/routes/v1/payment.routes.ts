import { Router } from 'express';
import { z } from 'zod';
import { optionalCustomerAuth } from '../../middleware/customer-auth.js';
import { checkoutRateLimit } from '../../middleware/rate-limit.js';
import { createPaymentIntent, isStripeConfigured } from '../../services/mrpaps-payment.service.js';
import { getOrderForPayment } from '../../db/mrpaps-orders.repository.js';
import { NotFoundError } from '../../types/errors.js';

export const v1PaymentRouter: Router = Router();

const createPaymentIntentSchema = z.object({
  publicOrderId: z.string().min(1),
});

v1PaymentRouter.post('/payment-intent', checkoutRateLimit, optionalCustomerAuth, async (req, res, next) => {
  try {
    if (!isStripeConfigured()) {
      res.status(503).json({ error: 'Pagos en línea no configurados. Contacta al vendedor.' });
      return;
    }

    const { publicOrderId } = createPaymentIntentSchema.parse(req.body);
    const order = await getOrderForPayment(publicOrderId);
    if (!order) throw new NotFoundError('Pedido no encontrado');

    const { clientSecret, paymentIntentId } = await createPaymentIntent({
      amountMxn: Number(order.total_mxn),
      orderId: order.id,
      publicOrderId: order.public_id,
      customerEmail: order.customer_email,
    });

    res.json({ data: { clientSecret, paymentIntentId } });
  } catch (err) {
    next(err);
  }
});
