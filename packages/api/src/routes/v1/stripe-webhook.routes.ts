import { Router } from 'express';
import { handleStripeWebhook, isStripeConfigured } from '../../services/mrpaps-payment.service.js';
import { logger } from '../../lib/logger.js';

export const v1StripeWebhookRouter: Router = Router();

v1StripeWebhookRouter.post(
  '/stripe',
  // raw body — express.json() must NOT be applied to this route
  async (req, res) => {
    if (!isStripeConfigured()) {
      res.status(503).send('Stripe no configurado');
      return;
    }

    const signature = req.header('stripe-signature');
    if (!signature) {
      res.status(400).send('Falta stripe-signature');
      return;
    }

    try {
      await handleStripeWebhook(req.body as Buffer, signature);
      res.json({ received: true });
    } catch (err) {
      logger.error({ err }, 'Stripe webhook error');
      res.status(400).send(`Webhook error: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
);
