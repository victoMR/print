"use client";

import { OrderDetailPage } from "@/components/boty/order-detail-page";

export function PedidoDetailContent({ publicOrderId }: { publicOrderId: string }) {
  return <OrderDetailPage publicOrderId={publicOrderId} variant="public" />;
}
