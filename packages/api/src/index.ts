import './load-env.js';
import { logger } from './lib/logger.js';

async function main(): Promise<void> {
  if (!process.env.ADMIN_JWT_SECRET || process.env.ADMIN_JWT_SECRET.length < 32) {
    throw new Error('ADMIN_JWT_SECRET is required (mínimo 32 caracteres)');
  }

  if (
    process.env.NODE_ENV === 'production' &&
    (!process.env.CUSTOMER_JWT_SECRET || process.env.CUSTOMER_JWT_SECRET.length < 32)
  ) {
    throw new Error(
      'CUSTOMER_JWT_SECRET es obligatorio en producción (mínimo 32 caracteres). ' +
      'Define una clave independiente de ADMIN_JWT_SECRET.',
    );
  }

  const { getPgClientConfig } = await import('./lib/database-config.js');
  getPgClientConfig();

  const { validateDatabase } = await import('./lib/db.js');
  await validateDatabase();

  const { ensurePlaceholderAsset } = await import('./services/mrpaps-storage.service.js');
  await ensurePlaceholderAsset();

  const { getMailDiagnostics, isMailConfigured } = await import('./lib/mail.js');
  const mailDiag = getMailDiagnostics();
  if (isMailConfigured()) {
    logger.info(
      { host: mailDiag.host, port: mailDiag.port, user: mailDiag.userMasked, from: mailDiag.from },
      'SMTP configurado para correos transaccionales',
    );
  } else {
    logger.warn({ missing: mailDiag.missing }, 'SMTP no configurado — no se enviarán correos de pedido');
  }

  const { connectRedis } = await import('./lib/queue.js');
  const { isPrintfulConfigured } = await import('./lib/printful.js');
  const redisOk = await connectRedis();

  if (redisOk && isPrintfulConfigured()) {
    const { startWebhookWorker } = await import('./workers/webhook.worker.js');
    const worker = startWebhookWorker();
    if (worker) {
      logger.info('Worker BullMQ printful-webhook activo');
    }
  } else if (redisOk) {
    logger.info('Printful no configurado; worker de webhooks omitido');
  }

  const { createApp } = await import('./app.js');

  const app = createApp();
  const port = Number(process.env.PORT ?? 4000);

  app.listen(port, () => {
    logger.info({ port }, 'API Mr. Paps escuchando');
  });
}

main().catch((err) => {
  console.error('Fatal boot error:', err);
  process.exit(1);
});
