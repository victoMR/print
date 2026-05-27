import { Worker, type Job } from 'bullmq';
import { getRedisConnection } from '../lib/queue.js';
import type { WebhookJobData } from '../lib/queue.js';
import { processWebhookEvent } from '../services/webhooks.service.js';
import { WebhookPayload } from '../schemas/webhook.schema.js';
import { logger } from '../lib/logger.js';

export function startWebhookWorker(): Worker<WebhookJobData> | null {
  const connection = getRedisConnection();
  if (!connection) {
    return null;
  }

  const worker = new Worker<WebhookJobData>(
    'printful-webhook',
    async (job: Job<WebhookJobData>) => {
      const payload = WebhookPayload.parse({
        type: job.data.type,
        data: job.data.data,
      });
      await processWebhookEvent(payload);
    },
    { connection },
  );

  worker.on('failed', (job: Job<WebhookJobData> | undefined, err: Error) => {
    logger.error({ jobId: job?.id, err }, 'Webhook job failed');
  });

  return worker;
}
