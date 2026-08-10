import * as ordersRepo from '../db/mrpaps-orders.repository.js';
import { parseGuestTrackingInput } from '../lib/order-tracking-code.js';
import { BadRequestError, NotFoundError } from '../types/errors.js';
import { getOrderDetail, mapGuestOrderDetail, type OrderDetailDto } from './mrpaps-order-detail.service.js';

const GUEST_LOOKUP_MESSAGE = 'No encontramos un pedido con ese código y correo.';

const INVALID_CODE_MESSAGE =
  'Código no reconocido. Usa el código de seguimiento que recibiste al comprar (formato MRP-XXXX-XXXX-XXXX con letras y números). ' +
  'El número MRP-2026-00006 es solo referencia interna en "Mis pedidos"; si lo tienes, también puedes usarlo junto con tu correo.';

async function findOrderByGuestCodeAndEmail(code: string, email: string) {
  const parsed = parseGuestTrackingInput(code);
  if (!parsed) return null;

  if (parsed.kind === 'public_id') {
    return ordersRepo.getOrderByPublicIdAndEmail(parsed.value, email);
  }

  return ordersRepo.getOrderByOrderNumberAndEmail(parsed.value, email);
}

export async function trackGuestOrder(input: {
  trackingCode: string;
  email: string;
}): Promise<OrderDetailDto> {
  const parsed = parseGuestTrackingInput(input.trackingCode);
  if (!parsed) throw new BadRequestError(INVALID_CODE_MESSAGE, 'INVALID_TRACKING_CODE');

  const order = await findOrderByGuestCodeAndEmail(input.trackingCode, input.email);
  if (!order) throw new NotFoundError(GUEST_LOOKUP_MESSAGE, 'ORDER_NOT_FOUND');
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
  const order = await ordersRepo.getOrderForCustomer(trackingCode, userId, email);
  if (!order) throw new NotFoundError('Pedido no encontrado', 'ORDER_NOT_FOUND');
  return getOrderDetail(order.public_id, order);
}
