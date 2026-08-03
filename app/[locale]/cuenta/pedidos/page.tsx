"use client";

import { useEffect, useState } from "react";
import { Link } from "@/lib/i18n/navigation";
import { ArrowRight, Loader2, Package } from "lucide-react";
import {
  BotyAlert,
  BotyBadge,
  BotyButton,
  BotyEmptyState,
  BotyPageHeader,
  BotySurface,
} from "@/components/boty/ui-patterns";
import { listMyOrders, type AccountOrder } from "@/lib/customer-api";
import { formatCurrency } from "@/lib/utils";

function orderAmount(order: AccountOrder): string {
  return formatCurrency((order.currency === "USD" ? order.totalUsd : order.totalMxn) ?? "0", order.currency);
}

const STATUS_STYLE: Record<string, string> = {
  pedido: "bg-blue-500/15 text-blue-800",
  solicitado_imprenta: "bg-amber-500/15 text-amber-900",
  recibido_imprenta: "bg-violet-500/15 text-violet-900",
  enviado: "bg-emerald-500/15 text-emerald-800",
  cancelado: "bg-muted text-muted-foreground",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMyOrders()
      .then(setOrders)
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar pedidos"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <BotyPageHeader
        title="Mis pedidos"
        description="Sigue el estado de tus compras y abre el detalle de cada pedido."
      />

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          Cargando pedidos…
        </div>
      )}

      {error && <BotyAlert variant="error">{error}</BotyAlert>}

      {!loading && !error && orders.length === 0 && (
        <BotyEmptyState
          title="Aún no tienes pedidos"
          description="Cuando compres en la tienda, aparecerán aquí con su estado y total."
          action={
            <Link href="/shop">
              <BotyButton variant="primary">Explorar productos</BotyButton>
            </Link>
          }
        />
      )}

      <ul className="space-y-4">
        {orders.map((order) => (
          <li key={order.publicId}>
            <Link href={`/cuenta/pedidos/${order.publicId}`} className="block group">
              <BotySurface className="p-5 md:p-6 hover:border-primary/30 boty-transition">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-semibold text-base tracking-wide">
                      {order.trackingCode}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {new Date(order.orderedAt).toLocaleDateString("es-MX", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      {" · "}
                      {order.itemCount} {order.itemCount === 1 ? "pieza" : "piezas"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-auto">
                    <BotyBadge className={STATUS_STYLE[order.status] ?? "bg-muted text-muted-foreground"}>
                      {order.statusLabel}
                    </BotyBadge>
                    <span className="font-serif text-xl tabular-nums">{orderAmount(order)}</span>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 boty-transition" />
                  </div>
                </div>
              </BotySurface>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
