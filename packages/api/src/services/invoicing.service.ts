import { logger } from '../lib/logger.js';

/**
 * Skeleton CFDI 4.0 via PAC — implementar con Facturama/SW/Konfio.
 */
export async function issueCfdi(_params: {
  internalOrderId: string;
  customerRfc?: string;
  totalMxn: string;
}): Promise<{ uuid: string; xmlUrl: string } | null> {
  if (!process.env.PAC_API_KEY) {
    logger.warn('PAC_API_KEY not set; skipping CFDI issuance');
    return null;
  }

  // TODO: integrate PAC provider from PAC_PROVIDER env
  throw new Error('CFDI issuance not implemented');
}
