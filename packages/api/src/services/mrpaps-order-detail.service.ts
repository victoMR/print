import * as ordersRepo from '../db/mrpaps-orders.repository.js';
import type { MrpapsOrderStatus, MrpapsOrderWithItems } from '../db/mrpaps.types.js';
import { formatTrackingCodeDisplay } from '../lib/order-tracking-code.js';
import { NotFoundError } from '../types/errors.js';

const STATUS_FLOW: MrpapsOrderStatus[] = [
  'pedido',
  'solicitado_imprenta',
  'recibido_imprenta',
  'enviado',
];

export type OrderDetailDto = {
  publicId: string;
  trackingCode: string;
  orderNumber: string;
  status: MrpapsOrderStatus;
  orderedAt: string;
  paymentStatus: string | null;
  stripePaymentIntentId?: string | null;
  customer: {
    name: string;
    email: string;
    phone: string;
    taxNumber: string | null;
  };
  shipping: {
    label: string | null;
    method: string;
    address1: string;
    address2: string | null;
    city: string;
    stateCode: string;
    zip: string;
    countryCode: string;
  };
  currency: 'MXN' | 'USD';
  totals: {
    subtotalMxn: string | null;
    shippingMxn: string | null;
    taxMxn: string | null;
    totalMxn: string | null;
    subtotalUsd: string | null;
    shippingUsd: string | null;
    taxUsd: string | null;
    totalUsd: string | null;
  };
  tracking: {
    number: string | null;
    url: string | null;
    carrier: string | null;
    shippedAt: string | null;
  };
  items: Array<{
    id: string;
    productName: string;
    variantLabel: string;
    sku: string;
    quantity: number;
    unitPriceMxn: string;
    lineTotalMxn: string;
    unitPriceUsd: string | null;
    lineTotalUsd: string | null;
    thumbnailUrl: string | null;
    printFileUrl: string | null;
  }>;
  timeline: Array<{
    status: MrpapsOrderStatus;
    label: string;
    at: string | null;
    done: boolean;
    current: boolean;
  }>;
  statusHistory: Array<{
    fromStatus: MrpapsOrderStatus | null;
    toStatus: MrpapsOrderStatus;
    note: string | null;
    at: string;
    createdBy: string | null;
  }>;
  internalNotes?: string | null;
};

const STATUS_LABELS: Record<MrpapsOrderStatus, string> = {
  pendiente_pago: 'Pago pendiente',
  pedido: 'Pedido recibido',
  solicitado_imprenta: 'Solicitado a imprenta',
  recibido_imprenta: 'Recibido de imprenta',
  enviado: 'Enviado',
  cancelado: 'Cancelado',
};

function buildTimeline(
  status: MrpapsOrderStatus,
  order: MrpapsOrderWithItems,
): OrderDetailDto['timeline'] {
  const timestamps: Partial<Record<MrpapsOrderStatus, string | null>> = {
    pedido: order.ordered_at,
    solicitado_imprenta: order.requested_at ?? null,
    recibido_imprenta: order.received_at ?? null,
    enviado: order.shipped_at,
  };

  if (status === 'pendiente_pago') {
    return [
      {
        status: 'pendiente_pago',
        label: STATUS_LABELS.pendiente_pago,
        at: order.ordered_at,
        done: false,
        current: true,
      },
    ];
  }

  if (status === 'cancelado') {
    return [
      {
        status: 'pedido',
        label: STATUS_LABELS.pedido,
        at: order.ordered_at,
        done: true,
        current: false,
      },
      {
        status: 'cancelado',
        label: STATUS_LABELS.cancelado,
        at: order.updated_at,
        done: true,
        current: true,
      },
    ];
  }

  const currentIdx = STATUS_FLOW.indexOf(status);
  return STATUS_FLOW.map((s, idx) => ({
    status: s,
    label: STATUS_LABELS[s],
    at: timestamps[s] ?? null,
    done: idx <= currentIdx,
    current: s === status,
  }));
}

function mapOrder(
  order: MrpapsOrderWithItems,
  events: Awaited<ReturnType<typeof ordersRepo.listOrderStatusEvents>>,
  options?: { includeInternal?: boolean },
): OrderDetailDto {
  const paymentStatus = order.payment_status ?? null;

  const detail: OrderDetailDto = {
    publicId: order.public_id,
    trackingCode: formatTrackingCodeDisplay(order.public_id),
    orderNumber: order.order_number,
    status: order.status,
    orderedAt: order.ordered_at ?? order.created_at,
    paymentStatus,
    customer: {
      name: order.customer_name,
      email: order.customer_email,
      phone: order.customer_phone,
      taxNumber: order.customer_tax_number,
    },
    shipping: {
      label: order.shipping_label,
      method: order.shipping_method,
      address1: order.ship_address1,
      address2: order.ship_address2,
      city: order.ship_city,
      stateCode: order.ship_state_code,
      zip: order.ship_zip,
      countryCode: order.ship_country_code,
    },
    currency: order.currency,
    totals: {
      subtotalMxn: order.subtotal_mxn !== null ? Number(order.subtotal_mxn).toFixed(2) : null,
      shippingMxn: order.shipping_mxn !== null ? Number(order.shipping_mxn).toFixed(2) : null,
      taxMxn: order.tax_mxn !== null ? Number(order.tax_mxn).toFixed(2) : null,
      totalMxn: order.total_mxn !== null ? Number(order.total_mxn).toFixed(2) : null,
      subtotalUsd: order.subtotal_usd !== null ? Number(order.subtotal_usd).toFixed(2) : null,
      shippingUsd: order.shipping_usd !== null ? Number(order.shipping_usd).toFixed(2) : null,
      taxUsd: order.tax_usd !== null ? Number(order.tax_usd).toFixed(2) : null,
      totalUsd: order.total_usd !== null ? Number(order.total_usd).toFixed(2) : null,
    },
    tracking: {
      number: order.tracking_number,
      url: order.tracking_url,
      carrier: order.carrier,
      shippedAt: order.shipped_at,
    },
    items: order.items.map((i) => {
      const unit = Number(i.unit_price_mxn);
      const unitUsd = i.unit_price_usd !== null ? Number(i.unit_price_usd) : null;
      return {
        id: i.id,
        productName: i.product_name,
        variantLabel: i.variant_label,
        sku: i.sku,
        quantity: i.quantity,
        unitPriceMxn: unit.toFixed(2),
        lineTotalMxn: (unit * i.quantity).toFixed(2),
        unitPriceUsd: unitUsd !== null ? unitUsd.toFixed(2) : null,
        lineTotalUsd: unitUsd !== null ? (unitUsd * i.quantity).toFixed(2) : null,
        thumbnailUrl: i.thumbnail_url,
        printFileUrl: i.print_file_url,
      };
    }),
    timeline: buildTimeline(order.status, order),
    statusHistory: events.map((e) => ({
      fromStatus: e.from_status,
      toStatus: e.to_status,
      note: e.note,
      at: e.created_at,
      createdBy: e.created_by,
    })),
  };

  if (options?.includeInternal) {
    detail.internalNotes = order.internal_notes;
    detail.stripePaymentIntentId = order.stripe_payment_intent_id;
  }

  return detail;
}

function stripGuestFields(detail: OrderDetailDto): OrderDetailDto {
  return {
    ...detail,
    internalNotes: undefined,
    // Strip PII that is only needed in authenticated/admin contexts.
    customer: {
      name: detail.customer.name,
      email: detail.customer.email,
      phone: '',          // not returned to unauthenticated callers
      taxNumber: null,    // RFC is legally sensitive PII
    },
    items: detail.items.map((item) => ({
      ...item,
      printFileUrl: null, // production print files are admin-only
    })),
  };
}

export async function mapGuestOrderDetail(order: MrpapsOrderWithItems): Promise<OrderDetailDto> {
  const events = await ordersRepo.listOrderStatusEvents(order.id);
  const detail = stripGuestFields(mapOrder(order, events));
  // No exponer el número secuencial predecible (MRP-2026-00006) a invitados.
  return { ...detail, orderNumber: detail.trackingCode };
}

export async function getOrderDetail(
  publicId: string,
  preloaded?: MrpapsOrderWithItems,
): Promise<OrderDetailDto> {
  const order = preloaded ?? (await ordersRepo.getOrderByPublicId(publicId));
  if (!order) throw new NotFoundError('Pedido no encontrado');
  const events = await ordersRepo.listOrderStatusEvents(order.id);
  return mapOrder(order, events);
}

export async function getAdminOrderDetail(publicId: string): Promise<OrderDetailDto> {
  const order = await ordersRepo.getOrderByPublicId(publicId);
  if (!order) throw new NotFoundError('Pedido no encontrado');
  // Oculta solo carritos abandonados (nunca llegaron a ser un pedido real);
  // un pedido cancelado/reembolsado sigue siendo real y debe verse en el admin.
  if (order.status === 'pendiente_pago') {
    throw new NotFoundError('Pedido no encontrado');
  }
  const events = await ordersRepo.listOrderStatusEvents(order.id);
  return mapOrder(order, events, { includeInternal: true });
}

export { STATUS_LABELS as ORDER_DETAIL_STATUS_LABELS };
