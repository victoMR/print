import * as ordersRepo from '../db/mrpaps-orders.repository.js';
import { normalizeTrackingCode } from '../lib/order-tracking-code.js';
import { BadRequestError, NotFoundError } from '../types/errors.js';
import { getOrderDetail, mapGuestOrderDetail, type OrderDetailDto } from './mrpaps-order-detail.service.js';

const GUEST_LOOKUP_MESSAGE = 'No encontramos un pedido con ese código y correo.';

function assertValidTrackingCode(raw: string): string {
  const normalized = normalizeTrackingCode(raw);
  if (!normalized) {
    throw new BadRequestError('Código de seguimiento inválido. Debe tener el formato MRP-XXXX-XXXX-XXXX.');
  }
  return normalized;
}

export async function trackGuestOrder(input: {
  trackingCode: string;
  email: string;
}): Promise<OrderDetailDto> {
  const publicId = assertValidTrackingCode(input.trackingCode);
  const order = await ordersRepo.getOrderByPublicIdAndEmail(publicId, input.email);
  if (!order) throw new NotFoundError(GUEST_LOOKUP_MESSAGE);
  return mapGuestOrderDetail(order);
}

export async function getGuestOrderByCodeAndEmail(
  trackingCode: string,
  email: string,
): Promise<OrderDetailDto> {
  return trackGuestOrder({ trackingCode, email });
}

export async function getCustomerOrderDetail(
  trackingCode: string,
  userId: string,
  email: string,
): Promise<OrderDetailDto> {
  const publicId = assertValidTrackingCode(trackingCode);
  const order = await ordersRepo.getOrderForCustomer(publicId, userId, email);
  if (!order) throw new NotFoundError('Pedido no encontrado');
  return getOrderDetail(publicId, order);
}
