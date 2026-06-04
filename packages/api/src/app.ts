import express from 'express';
import { pinoHttp } from 'pino-http';
import { logger } from './lib/logger.js';
import { v1Router } from './routes/v1/index.js';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { getUploadRoot } from './services/mrpaps-storage.service.js';
import {
  stripeWebhookHandler,
  stripeWebhookHealth,
  stripeWebhookRawBody,
} from './routes/v1/stripe-webhook.routes.js';
import { isRedisReady } from './lib/queue.js';
import { getCacheStats } from './lib/cache.js';

const STRIPE_WEBHOOK_PATHS = [
  '/api/v1/webhooks/stripe',
  '/api/v1/webhook/stripe', // alias typo común
] as const;

export function createApp(): express.Application {
  const app = express();

  app.use(corsMiddleware);
  app.use(pinoHttp({ logger }));

  // Stripe: ANTES de express.json() — el body debe quedar como Buffer
  for (const path of STRIPE_WEBHOOK_PATHS) {
    app.get(path, stripeWebhookHealth);
    app.post(path, stripeWebhookRawBody, (req, res) => void stripeWebhookHandler(req, res));
  }

  app.use(express.json());

  app.use('/uploads', express.static(getUploadRoot(), {
    maxAge: '7d',
    fallthrough: true,
  }));

  app.get('/health', (_req, res) => {
    const cache = getCacheStats();
    res.json({
      status: 'ok',
      service: '@print/api',
      redis: isRedisReady() ? 'connected' : 'disabled',
      cache: { hits: cache.hits, misses: cache.misses },
    });
  });

  app.use('/api/v1', v1Router);

  app.use(errorHandler);

  return app;
}
