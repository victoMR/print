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
import { webhooksRouter } from './routes/webhooks.routes.js';

const STRIPE_WEBHOOK_PATHS = [
  '/api/v1/webhooks/stripe',
  '/api/v1/webhook/stripe', // alias typo común
] as const;

export function createApp(): express.Application {
  const app = express();

  // Trust the first proxy hop (nginx / Vercel edge) so express-rate-limit
  // sees the real client IP from X-Forwarded-For instead of the proxy IP.
  app.set('trust proxy', 1);

  app.use(corsMiddleware);
  app.use(pinoHttp({ logger }));

  // Stripe: ANTES de express.json() — el body debe quedar como Buffer
  for (const path of STRIPE_WEBHOOK_PATHS) {
    app.get(path, stripeWebhookHealth);
    app.post(path, stripeWebhookRawBody, (req, res) => void stripeWebhookHandler(req, res));
  }

  app.use(express.json());

  if (process.env.WEBHOOK_SECRET?.trim()) {
    app.use(webhooksRouter);
  }

  app.use('/uploads', express.static(getUploadRoot(), {
    maxAge: '7d',
    fallthrough: true,
    setHeaders(res, filePath) {
      // Force SVG files to download rather than render — prevents stored XSS
      // via <script> tags in SVGs served on the same origin.
      if (filePath.endsWith('.svg')) {
        res.setHeader('Content-Disposition', 'attachment');
      }
    },
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
