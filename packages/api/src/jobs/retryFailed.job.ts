import { logger } from '../lib/logger.js';

/** Retry failed Printful orders / webhook processing. */
export async function retryFailedJob(): Promise<void> {
  logger.info('Retry failed job — stub');
  // TODO: query printful_orders + webhook_events WHERE processed_at IS NULL
}
