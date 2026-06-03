import express from 'express';
import { pinoHttp } from 'pino-http';
import { logger } from './lib/logger.js';
import { v1Router } from './routes/v1/index.js';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { getUploadRoot } from './services/mrpaps-storage.service.js';

export function createApp(): express.Application {
  const app = express();

  app.use(corsMiddleware);
  app.use(pinoHttp({ logger }));
  app.use(
    '/api/v1/webhooks/stripe',
    express.raw({ type: 'application/json' }),
  );
  app.use(express.json());

  app.use('/uploads', express.static(getUploadRoot(), {
    maxAge: '7d',
    fallthrough: true,
  }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: '@print/api' });
  });

  app.use('/api/v1', v1Router);

  app.use(errorHandler);

  return app;
}
