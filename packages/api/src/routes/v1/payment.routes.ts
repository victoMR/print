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

    // Ownership check: if the order belongs to a registered user, require the caller
    // to be that user. Guest orders (user_id = null) are accessible with the publicOrderId.
    if (order.user_id && req.customerUser?.id !== order.user_id) {
      throw new NotFoundError('Pedido no encontrado');
    }

    // Guard against creating a new PaymentIntent on an already-paid order.
    if (order.payment_status === 'paid') {
      res.status(409).json({ error: 'Este pedido ya fue pagado.' });
      return;
    }

    const amount = order.currency === 'USD' ? Number(order.total_usd) : Number(order.total_mxn);
    const { clientSecret, paymentIntentId } = await createPaymentIntent({
      amount,
      currency: order.currency === 'USD' ? 'usd' : 'mxn',
      orderId: order.id,
      publicOrderId: order.public_id,
      customerEmail: order.customer_email,
    });

    res.json({ data: { clientSecret, paymentIntentId } });
  } catch (err) {
    next(err);
  }
});
