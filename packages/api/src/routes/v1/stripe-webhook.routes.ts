import type { Request, Response, RequestHandler } from 'express';
import express from 'express';
import { handleStripeWebhook, isStripeConfigured } from '../../services/mrpaps-payment.service.js';
import { logger } from '../../lib/logger.js';

/** Body crudo obligatorio para validar la firma de Stripe. */
export const stripeWebhookRawBody: RequestHandler = express.raw({ type: 'application/json' });

export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  if (!isStripeConfigured()) {
    res.status(503).send('Stripe no configurado');
    return;
  }

  const signature = req.header('stripe-signature');
  if (!signature) {
    res.status(400).send('Falta stripe-signature');
    return;
  }

  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    logger.error(
      { bodyType: typeof rawBody, path: req.path },
      'Webhook Stripe: body no es Buffer — revisa que la ruta no pase por express.json()',
    );
    res.status(400).send('Body inválido para webhook (debe ser raw)');
    return;
  }

  try {
    await handleStripeWebhook(rawBody, signature);
    res.json({ received: true });
  } catch (err) {
    logger.error({ err, path: req.path }, 'Stripe webhook error');
    res.status(400).send(`Webhook error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function stripeWebhookHealth(_req: Request, res: Response): void {
  res.json({
    ok: true,
    endpoint: 'POST /api/v1/webhooks/stripe',
    hint: 'Configura esta URL exacta (HTTPS) en Stripe Dashboard → Webhooks',
  });
}
