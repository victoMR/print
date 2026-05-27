import { logger } from '../lib/logger.js';

/** Warn 30 days before Printful private token expiration (manual rotation). */
export async function tokenExpiryJob(): Promise<void> {
  logger.info('Token expiry check — stub (configure expiry date in ops runbook)');
  // TODO: read token metadata from secure store; alert if expiring within 30 days
}
