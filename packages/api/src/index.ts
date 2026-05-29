import './load-env.js';
import { logger } from './lib/logger.js';

async function validatePrintfulToken(): Promise<void> {
  const { printful } = await import('./lib/printful.js');
  const { callPrintful } = await import('./services/printful.helper.js');

  await callPrintful(
    () => printful.get('/store'),
    { operation: 'validatePrintfulToken' },
  );
}

async function validateSupabase(): Promise<void> {
  const { supabase } = await import('./lib/supabase.js');

  const { error } = await supabase.from('mrpaps_orders').select('id').limit(1);
  if (error) {
    throw new Error(
      `Supabase: tabla mrpaps_orders no disponible. Ejecuta supabase/migrations/003_mrpaps_core.sql — ${error.message}`,
    );
  }

  logger.info('Supabase connection OK (mrpaps_*)');
}

async function main(): Promise<void> {
  if (!process.env.SUPABASE_URL) {
    throw new Error('SUPABASE_URL is required');
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  }

  if (!process.env.ADMIN_JWT_SECRET || process.env.ADMIN_JWT_SECRET.length < 32) {
    throw new Error('ADMIN_JWT_SECRET is required (mínimo 32 caracteres)');
  }

  await validateSupabase();

  if (process.env.PRINTFUL_TOKEN) {
    await validatePrintfulToken();
    logger.info('Printful token OK (opcional; rutas legacy)');
  } else {
    logger.warn('PRINTFUL_TOKEN no definido — modo Mr. Paps (solo Supabase)');
  }

  const { connectRedis } = await import('./lib/queue.js');
  const redisOk = await connectRedis();

  const { createApp } = await import('./app.js');
  const { startWebhookWorker } = await import('./workers/webhook.worker.js');

  const app = createApp();
  const port = Number(process.env.PORT ?? 4000);

  if (redisOk) {
    startWebhookWorker();
  }

  app.listen(port, () => {
    logger.info({ port }, 'API Mr. Paps escuchando');
  });
}

main().catch((err) => {
  console.error('Fatal boot error:', err);
  process.exit(1);
});
