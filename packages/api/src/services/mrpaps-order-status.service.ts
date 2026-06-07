import * as ordersRepo from '../db/mrpaps-orders.repository.js';
import type { MrpapsOrderRow, MrpapsOrderStatus } from '../db/mrpaps.types.js';
import { BadRequestError } from '../types/errors.js';
import { refundPaidOrder } from './mrpaps-stripe-refund.service.js';

type StatusPatch = Partial<{
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
  internal_notes: string | null;
  requested_at: string | null;
  received_at: string | null;
  shipped_at: string | null;
}>;

/**
 * Cambio de estado con reembolso Stripe automático al cancelar pedidos pagados.
 */
export async function changeOrderStatus(
  publicId: string,
  toStatus: MrpapsOrderStatus,
  patch: StatusPatch,
  meta: { note?: string; createdBy?: string },
): Promise<MrpapsOrderRow> {
  const existing = await ordersRepo.getOrderByPublicId(publicId);
  if (!existing) throw new BadRequestError('Pedido no encontrado');

  if (toStatus === 'cancelado' && existing.payment_status === 'paid') {
    const refund = await refundPaidOrder(publicId, {
      reason: 'admin_cancel',
      note: meta.note,
    });
    if (!refund.ok) {
      throw new BadRequestError(
        `No se pudo reembolsar el pago en Stripe: ${refund.error}. El pedido no fue cancelado.`,
      );
    }
  }

  return ordersRepo.updateOrderStatus(publicId, toStatus, patch, meta);
}
