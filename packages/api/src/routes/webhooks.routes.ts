import { Router } from 'express';
import { WebhookPayload } from '../schemas/webhook.schema.js';
import { getWebhookQueue } from '../lib/queue.js';
import { processWebhookEvent } from '../services/webhooks.service.js';
import { logger } from '../lib/logger.js';

export const webhooksRouter: Router = Router();

/**
 * Responde 200 de inmediato; procesa en cola BullMQ o inline si Redis no está.
 */
webhooksRouter.post('/webhooks/printful/:secret', async (req, res) => {
  if (req.params.secret !== process.env.WEBHOOK_SECRET) {
    res.status(404).end();
    return;
  }

  res.status(200).send('OK');

  try {
    const parsed = WebhookPayload.parse(req.body);
    const job = {
      type: parsed.type,
      data: parsed.data,
      receivedAt: Date.now(),
    };

    const queue = getWebhookQueue();
    if (queue) {
      await queue.add('printful-event', job);
      return;
    }

    setImmediate(() => {
      processWebhookEvent(parsed).catch((err) => {
        logger.error({ err, type: parsed.type }, 'Webhook inline processing failed');
      });
    });
  } catch (err) {
    logger.error({ err, body: req.body }, 'Webhook enqueue failed after 200');
  }
});
