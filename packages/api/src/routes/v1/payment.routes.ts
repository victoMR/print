import { Router } from 'express';
import { z } from 'zod';
import { optionalCustomerAuth } from '../../middleware/customer-auth.js';
import { checkoutRateLimit } from '../../middleware/rate-limit.js';
import { createPaymentIntent, isStripeConfigured } from '../../services/mrpaps-payment.service.js';
import { getOrderForPayment } from '../../db/mrpaps-orders.repository.js';
import { MarketMismatchError, NotFoundError } from '../../types/errors.js';
import { marketForCurrency, type Market } from '../../lib/market.js';
import { logger } from '../../lib/logger.js';

export const v1PaymentRouter: Router = Router();

const createPaymentIntentSchema = z.object({
  publicOrderId: z.string().min(1),
});

function readVerifiedMarket(value: string | string[] | undefined): Market | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'mx' || raw === 'us' ? raw : null;
}

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

    // Last checkpoint before an actual Stripe charge — re-verified here even
    // if order creation already checked, since time may have passed (order
    // created, tab left open, customer came back later). Hard block only on
    // a CONFIRMED mismatch; inconclusive geolocation (verifiedMarket === null)
    // never blocks a real payment, just gets logged for later review.
    const verifiedMarket = readVerifiedMarket(req.headers['x-verified-market']);
    if (verifiedMarket && verifiedMarket !== marketForCurrency(order.currency)) {
      throw new MarketMismatchError(
        'La moneda de tu pedido no coincide con tu ubicación detectada. Cambia a la versión correcta del sitio (/mx o /us) para continuar.',
        verifiedMarket,
      );
    }
    if (!verifiedMarket) {
      logger.warn(
        { publicOrderId: order.public_id, orderCurrency: order.currency },
        'No se pudo verificar la ubicación real al momento de pagar — se permite el pago (fail-open).',
      );
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
