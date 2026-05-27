import express from 'express';
import { pinoHttp } from 'pino-http';
import { logger } from './lib/logger.js';
import { catalogRouter } from './routes/catalog.routes.js';
import { checkoutRouter } from './routes/checkout.routes.js';
import { webhooksRouter } from './routes/webhooks.routes.js';
import { v1Router } from './routes/v1/index.js';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(): express.Application {
  const app = express();

  app.use(corsMiddleware);
  app.use(pinoHttp({ logger }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: '@print/api' });
  });

  app.use('/api/v1', v1Router);

  // Legacy paths (deprecated — use /api/v1)
  app.use('/api/catalog', catalogRouter);
  app.use('/api/checkout', checkoutRouter);
  app.use(webhooksRouter);

  app.use(errorHandler);

  return app;
}
