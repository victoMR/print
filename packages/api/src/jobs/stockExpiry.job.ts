import { releaseExpiredOrderReservations } from '../db/mrpaps-orders.repository.js';
import { logger } from '../lib/logger.js';

/** Libera stock reservado por órdenes pendiente_pago que superaron su TTL de 20 minutos. */
export async function stockExpiryJob(): Promise<void> {
  const released = await releaseExpiredOrderReservations();
  if (released > 0) {
    logger.info({ released }, 'Stock expirado liberado');
  }
}
