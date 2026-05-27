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

  const { error } = await supabase.from('printful_orders').select('id').limit(1);
  if (error) {
    throw new Error(`Supabase connection failed: ${error.message}`);
  }

  logger.info('Supabase connection OK');
}

async function main(): Promise<void> {
  if (!process.env.PRINTFUL_TOKEN) {
    throw new Error('PRINTFUL_TOKEN is required');
  }

  if (!process.env.SUPABASE_URL) {
    throw new Error('SUPABASE_URL is required');
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  }

  await validatePrintfulToken();
  await validateSupabase();

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
    logger.info({ port }, 'API Printful escuchando');
  });
}

main().catch((err) => {
  console.error('Fatal boot error:', err);
  process.exit(1);
});
