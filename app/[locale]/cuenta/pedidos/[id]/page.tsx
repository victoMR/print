"use client";

import { Suspense } from "react";
import { use } from "react";
import { BotyPageHeader } from "@/components/boty/ui-patterns";
import { OrderDetailPage } from "@/components/boty/order-detail-page";

type PageProps = { params: Promise<{ id: string }> };

function CuentaPedidoContent({ publicOrderId }: { publicOrderId: string }) {
  return (
    <>
      <BotyPageHeader title="Detalle del pedido" />
      <OrderDetailPage publicOrderId={publicOrderId} variant="account" />
    </>
  );
}

export default function CuentaPedidoDetailPage({ params }: PageProps) {
  const { id } = use(params);
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
      <CuentaPedidoContent publicOrderId={id} />
    </Suspense>
  );
}
