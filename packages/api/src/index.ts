import './load-env.js';
import { logger } from './lib/logger.js';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  if (!process.env.ADMIN_JWT_SECRET || process.env.ADMIN_JWT_SECRET.length < 32) {
    throw new Error('ADMIN_JWT_SECRET is required (mínimo 32 caracteres)');
  }

  const { validateDatabase } = await import('./lib/db.js');
  await validateDatabase();

  const { connectRedis } = await import('./lib/queue.js');
  const redisOk = await connectRedis();

  const { createApp } = await import('./app.js');

  const app = createApp();
  const port = Number(process.env.PORT ?? 4000);

  if (redisOk && process.env.ENABLE_PRINTFUL_WEBHOOKS === 'true') {
    const { startWebhookWorker } = await import('./workers/webhook.worker.js');
    startWebhookWorker();
    logger.info('Worker Printful (legacy) activo');
  }

  app.listen(port, () => {
    logger.info({ port }, 'API Mr. Paps escuchando');
  });
}

main().catch((err) => {
  console.error('Fatal boot error:', err);
  process.exit(1);
});
