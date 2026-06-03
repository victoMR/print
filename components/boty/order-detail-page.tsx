"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { fetchOrderDetail } from "@/lib/api";
import type { OrderDetail } from "@/lib/api-types";
import { OrderDetailSkeleton, OrderDetailView } from "./order-detail-view";
import { BotyAlert } from "./ui-patterns";

type OrderDetailPageProps = {
  publicOrderId: string;
  variant: "public" | "account";
};

function OrderDetailPageInner({ publicOrderId, variant }: OrderDetailPageProps) {
  const params = useSearchParams();
  const paid = params.get("paid") === "1";
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchOrderDetail(publicOrderId)
      .then((res) => setOrder(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el pedido"));
  }, [publicOrderId]);

  if (error) {
    return (
      <div className="max-w-lg mx-auto">
        <BotyAlert variant="error">{error}</BotyAlert>
      </div>
    );
  }

  if (!order) return <OrderDetailSkeleton />;

  return (
    <OrderDetailView
      order={order}
      showThankYou={paid}
      backHref={variant === "account" ? "/cuenta/pedidos" : undefined}
      backLabel="Mis pedidos"
    />
  );
}

export function OrderDetailPage(props: OrderDetailPageProps) {
  return (
    <Suspense fallback={<OrderDetailSkeleton />}>
      <OrderDetailPageInner {...props} />
    </Suspense>
  );
}
