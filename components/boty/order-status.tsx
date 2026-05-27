"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchOrderStatus } from "@/lib/api";
import { formatMxn } from "@/lib/utils";

type OrderStatusProps = {
  internalOrderId: string;
};

export function OrderStatus({ internalOrderId }: OrderStatusProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [total, setTotal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchOrderStatus(internalOrderId)
      .then((res) => {
        setStatus(res.data.status);
        setTotal(res.data.totalMxn);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "No se pudo cargar el pedido");
      });
  }, [internalOrderId]);

  return (
    <div className="bg-card rounded-3xl p-8 text-center max-w-lg mx-auto boty-shadow">
      <p className="text-sm text-primary font-medium">Pedido borrador creado</p>
      <h1 className="font-serif text-3xl mt-2">Gracias por tu pedido</h1>
      <p className="mt-4 text-sm text-muted-foreground break-all">
        ID: <span className="font-mono">{internalOrderId}</span>
      </p>
      {status && (
        <p className="mt-4">
          Estado: <span className="font-semibold capitalize">{status}</span>
        </p>
      )}
      {total && <p className="mt-2 text-lg font-semibold">{formatMxn(total)}</p>}
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      <p className="mt-6 text-xs text-muted-foreground">
        El cobro aún no se ha procesado. Recibirás confirmación cuando integremos pagos.
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
