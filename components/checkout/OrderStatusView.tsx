"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { fetchOrderStatus } from "@/lib/api";
import { formatMxn } from "@/lib/utils";
import { useEffect, useState } from "react";

type OrderStatusViewProps = {
  internalOrderId: string;
};

export function OrderStatusView({ internalOrderId }: OrderStatusViewProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [total, setTotal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchOrderStatus(internalOrderId)
      .then((res) => {
        setStatus(res.data.status);
        setTotal(res.data.totals.totalMxn);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "No se pudo cargar el pedido");
      });
  }, [internalOrderId]);

  return (
    <GlassCard className="p-8 text-center max-w-lg mx-auto">
      <p className="text-sm text-indigo-400 font-medium">Pedido borrador creado</p>
      <h1 className="text-2xl font-bold mt-2">Gracias por tu pedido</h1>
      <p className="mt-4 text-sm text-foreground/60 break-all">
        ID: <span className="font-mono">{internalOrderId}</span>
      </p>
      {status && (
        <p className="mt-4">
          Estado: <span className="font-semibold capitalize">{status}</span>
        </p>
      )}
      {total && <p className="mt-2 text-lg font-semibold">{formatMxn(total)}</p>}
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      <p className="mt-6 text-xs text-foreground/50">
        El cobro aún no se ha procesado. Recibirás confirmación cuando integremos pagos (Stripe).
      </p>
    </GlassCard>
  );
}
