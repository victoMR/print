"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchOrderStatus } from "@/lib/api";
import { ORDER_STATUS_LABELS, type MrpapsOrderStatus } from "@/lib/api-types";
import { formatMxn } from "@/lib/utils";

type OrderStatusProps = {
  internalOrderId: string;
};

export function OrderStatus({ internalOrderId }: OrderStatusProps) {
  const [status, setStatus] = useState<MrpapsOrderStatus | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [total, setTotal] = useState<string | null>(null);
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchOrderStatus(internalOrderId)
      .then((res) => {
        setStatus(res.data.status);
        setOrderNumber(res.data.orderNumber ?? null);
        setTotal(res.data.totalMxn);
        setTrackingUrl(res.data.trackingUrl);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "No se pudo cargar el pedido");
      });
  }, [internalOrderId]);

  return (
    <div className="bg-card rounded-3xl p-8 text-center max-w-lg mx-auto boty-shadow">
      <p className="text-sm text-primary font-medium">Pedido registrado</p>
      <h1 className="font-serif text-3xl mt-2">Gracias por tu pedido</h1>
      {orderNumber && (
        <p className="mt-3 text-sm font-medium">Folio: {orderNumber}</p>
      )}
      <p className="mt-2 text-xs text-muted-foreground break-all">
        Referencia: <span className="font-mono">{internalOrderId}</span>
      </p>
      {status && (
        <p className="mt-4">
          Estado:{" "}
          <span className="font-semibold">{ORDER_STATUS_LABELS[status] ?? status}</span>
        </p>
      )}
      {total && <p className="mt-2 text-lg font-semibold">{formatMxn(total)}</p>}
      {trackingUrl && (
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 text-sm text-primary underline"
        >
          Rastrear envío
        </a>
      )}
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      <p className="mt-6 text-xs text-muted-foreground">
        Te avisaremos por correo cuando tu pedido pase a impresión y envío.
      </p>
      <Link
        href="/shop"
        className="inline-flex mt-8 bg-primary text-primary-foreground px-8 py-3 rounded-full text-sm hover:bg-primary/90 boty-transition"
      >
        Seguir comprando
      </Link>
    </div>
  );
}
