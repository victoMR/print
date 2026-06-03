import { Router } from 'express';
import { z } from 'zod';
import { optionalCustomerAuth } from '../../middleware/customer-auth.js';
import { createPaymentIntent, isStripeConfigured } from '../../services/mrpaps-payment.service.js';
import { supabase } from '../../lib/supabase.js';
import { NotFoundError } from '../../types/errors.js';

export const v1PaymentRouter: Router = Router();

const createPaymentIntentSchema = z.object({
  publicOrderId: z.string().min(1),
});

v1PaymentRouter.post('/payment-intent', optionalCustomerAuth, async (req, res, next) => {
  try {
    if (!isStripeConfigured()) {
      res.status(503).json({ error: 'Pagos en línea no configurados. Contacta al vendedor.' });
      return;
    }

    const { publicOrderId } = createPaymentIntentSchema.parse(req.body);

    const { data: order, error } = await supabase
      .from('mrpaps_orders')
      .select('id, public_id, total_mxn, customer_email, user_id')
      .eq('public_id', publicOrderId)
      .maybeSingle();

    if (error) throw error;
    if (!order) throw new NotFoundError('Pedido no encontrado');

    const { clientSecret, paymentIntentId } = await createPaymentIntent({
      amountMxn: Number(order.total_mxn),
      orderId: order.id as string,
      publicOrderId: order.public_id as string,
      customerEmail: order.customer_email as string,
    });

    res.json({ data: { clientSecret, paymentIntentId } });
  } catch (err) {
    next(err);
  }
});
