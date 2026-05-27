import { syncProductsToDatabase } from '../services/catalog.service.js';
import { logger } from '../lib/logger.js';

/** Daily catalog sync — wire to BullMQ repeatable job in production. */
export async function syncCatalogJob(): Promise<void> {
  logger.info('Starting catalog sync job');
  const variantCount = await syncProductsToDatabase();
  logger.info({ variantCount }, 'Catalog sync job completed');
}
