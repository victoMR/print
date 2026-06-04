"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminFetchOrderDetail,
  adminListOrders,
  adminUpdateOrderStatus,
} from "@/lib/api";
import type { AdminOrderSummary, MrpapsOrderStatus, OrderDetail } from "@/lib/api-types";
import { ORDER_STATUS_LABELS, ORDER_STATUS_NEXT } from "@/lib/api-types";
import { cn, formatMxn } from "@/lib/utils";
import {
  BotyBadge,
  BotyButton,
  BotyLabel,
  BotySurface,
} from "@/components/boty/ui-patterns";
import { AdminSelect } from "@/components/admin/admin-select";
import { AdminViewToggle, useAdminViewMode } from "@/components/admin/admin-view-toggle";
import { RemoteImage } from "@/components/ui/remote-image";
import {
  ArrowLeft,
  Check,
  Circle,
  ExternalLink,
  Loader2,
  MapPin,
  Package,
  Search,
  Truck,
  X,
} from "lucide-react";
import { mxStateLabel } from "@/lib/mx-state-label";

const ALL_ORDER_STATUSES: MrpapsOrderStatus[] = [
  "pendiente_pago",
  "pedido",
  "solicitado_imprenta",
  "recibido_imprenta",
  "enviado",
  "cancelado",
];

const PAYMENT_BADGE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-900",
  paid: "bg-emerald-500/15 text-emerald-800",
  failed: "bg-destructive/15 text-destructive",
  refunded: "bg-muted text-muted-foreground",
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: "Pago pendiente",
  paid: "Pagado",
  failed: "Pago fallido",
  refunded: "Reembolsado",
};

const STATUS_BADGE: Record<MrpapsOrderStatus, string> = {
  pendiente_pago: "bg-amber-500/15 text-amber-900",
  pedido: "bg-blue-500/15 text-blue-800",
  solicitado_imprenta: "bg-amber-500/15 text-amber-900",
  recibido_imprenta: "bg-violet-500/15 text-violet-900",
  enviado: "bg-emerald-500/15 text-emerald-800",
  cancelado: "bg-muted text-muted-foreground",
};

type AdminOrdersSectionProps = {
  busy: boolean;
  setBusy: (v: boolean) => void;
  onError: (msg: string | null) => void;
  refreshKey?: number;
};

export function AdminOrdersSection({ busy, setBusy, onError, refreshKey = 0 }: AdminOrdersSectionProps) {
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [filterStatus, setFilterStatus] = useState<MrpapsOrderStatus | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [viewMode, setViewMode] = useAdminViewMode("admin-orders-view", "grid");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the search input → searchQuery
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(searchInput), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  const loadList = useCallback(async () => {
    onError(null);
    setListLoading(true);
    try {
      const res = await adminListOrders({
        status: filterStatus || undefined,
        search: searchQuery || undefined,
      });
      setOrders(res.data);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error al cargar pedidos");
    } finally {
      setListLoading(false);
    }
  }, [filterStatus, searchQuery, onError]);

  useEffect(() => {
    void loadList();
  }, [loadList, refreshKey]);

  const loadDetail = useCallback(
    async (publicId: string) => {
      setDetailLoading(true);
      onError(null);
      try {
        const res = await adminFetchOrderDetail(publicId);
        setDetail(res.data);
        setSelectedId(publicId);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Error al cargar detalle");
      } finally {
        setDetailLoading(false);
      }
    },
    [onError],
  );

  async function handleStatusChange(status: MrpapsOrderStatus) {
    if (!selectedId) return;
    setBusy(true);
    onError(null);
    try {
      let trackingNumber: string | null | undefined;
      let trackingUrl: string | null | undefined;
      let carrier: string | null | undefined;

      if (status === "enviado") {
        trackingNumber = window.prompt("Número de guía") ?? null;
        trackingUrl = window.prompt("URL de rastreo (opcional)") ?? null;
        carrier = window.prompt("Paquetería (opcional)") ?? null;
      }

      await adminUpdateOrderStatus(selectedId, {
        status,
        trackingNumber,
        trackingUrl,
        carrier,
      });
      await loadList();
      await loadDetail(selectedId);
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo actualizar");
    } finally {
      setBusy(false);
    }
  }

  if (selectedId && detail) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => {
            setSelectedId(null);
            setDetail(null);
          }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground boty-transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al listado
        </button>
        <AdminOrderDetail
          order={detail}
          busy={busy}
          onStatusChange={(s) => void handleStatusChange(s)}
        />
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <BotySurface className="p-4 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3">
        {/* Search bar */}
        <div className="relative flex-1 min-w-0 w-full sm:w-auto sm:min-w-[260px] sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre, correo o ID…"
            className="w-full rounded-xl border border-border bg-background pl-9 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 boty-transition placeholder:text-muted-foreground/60"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground boty-transition"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2 shrink-0">
          <BotyLabel className="shrink-0">Estado</BotyLabel>
          <AdminSelect
            value={filterStatus || "__all__"}
            onValueChange={(v) => setFilterStatus(v === "__all__" ? "" : (v as MrpapsOrderStatus))}
            className="max-w-[220px]"
            placeholder="Todos"
            options={[
              { value: "__all__", label: "Todos" },
              ...ALL_ORDER_STATUSES.map((s) => ({ value: s, label: ORDER_STATUS_LABELS[s] })),
            ]}
          />
        </div>

        <div className="flex items-center gap-3 sm:ml-auto">
          <AdminViewToggle value={viewMode} onChange={setViewMode} />
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
            {listLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            {orders.length} pedido{orders.length !== 1 ? "s" : ""}
          </span>
        </div>
      </BotySurface>

      {orders.length === 0 ? (
        <BotySurface className="p-12 text-center text-muted-foreground text-sm">
          {searchQuery
            ? `No se encontraron pedidos para "${searchQuery}".`
            : "No hay pedidos con este filtro."}
        </BotySurface>
      ) : viewMode === "grid" ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {orders.map((order) => (
            <li key={order.publicId}>
              <OrderGridCard order={order} onOpen={() => void loadDetail(order.publicId)} />
            </li>
          ))}
        </ul>
      ) : (
        <BotySurface className="overflow-hidden divide-y divide-border/50">
          {orders.map((order) => (
            <OrderListRow key={order.publicId} order={order} onOpen={() => void loadDetail(order.publicId)} />
          ))}
        </BotySurface>
      )}

      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
    </section>
  );
}

function OrderStatusBadges({ order }: { order: AdminOrderSummary }) {
  return (
    <>
      <BotyBadge className={STATUS_BADGE[order.status]}>
        {ORDER_STATUS_LABELS[order.status]}
      </BotyBadge>
      {order.paymentStatus && order.paymentStatus !== "paid" && (
        <BotyBadge className={PAYMENT_BADGE[order.paymentStatus] ?? "bg-muted text-muted-foreground"}>
          {PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}
        </BotyBadge>
      )}
    </>
  );
}

function OrderGridCard({
  order,
  onOpen,
}: {
  order: AdminOrderSummary;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left boty-transition hover:opacity-95"
    >
      <BotySurface className="p-4 hover:border-primary/40 h-full">
        <div className="flex gap-3">
          <OrderThumb items={order.items} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-serif text-lg">{order.orderNumber}</p>
              <OrderStatusBadges order={order} />
            </div>
            <p className="text-sm font-medium mt-1 truncate">{order.customerName}</p>
            <p className="text-xs text-muted-foreground truncate">{order.customerEmail}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(order.orderedAt).toLocaleDateString("es-MX")} · {order.itemCount}{" "}
              {order.itemCount === 1 ? "pieza" : "piezas"}
            </p>
            <p className="font-semibold text-primary mt-2 tabular-nums">
              {formatMxn(order.totalMxn)}
            </p>
          </div>
        </div>
      </BotySurface>
    </button>
  );
}

function OrderListRow({
  order,
  onOpen,
}: {
  order: AdminOrderSummary;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left px-4 py-3 hover:bg-muted/30 boty-transition flex items-center gap-3 sm:gap-4"
    >
      <OrderThumb items={order.items} size="sm" />
      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto] md:items-center gap-1 md:gap-4">
        <div className="min-w-0">
          <p className="font-serif text-base truncate">{order.orderNumber}</p>
          <p className="text-sm truncate">{order.customerName}</p>
          <p className="text-xs text-muted-foreground truncate hidden sm:block">{order.customerEmail}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <OrderStatusBadges order={order} />
        </div>
        <p className="text-xs text-muted-foreground whitespace-nowrap hidden lg:block">
          {new Date(order.orderedAt).toLocaleDateString("es-MX")} · {order.itemCount} pza.
        </p>
        <p className="font-semibold text-primary tabular-nums text-sm md:text-base whitespace-nowrap md:text-right">
          {formatMxn(order.totalMxn)}
        </p>
      </div>
    </button>
  );
}

function OrderThumb({
  items,
  size = "md",
}: {
  items: AdminOrderSummary["items"];
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "w-10 h-10" : "w-14 h-14";
  const thumb = items[0];
  if (!thumb) {
    return (
      <div className={cn(dim, "rounded-xl bg-muted flex items-center justify-center shrink-0")}>
        <Package className="w-5 h-5 text-muted-foreground" />
      </div>
    );
  }
  const url = thumb.thumbnailUrl;
  return (
    <div className={cn("relative rounded-xl overflow-hidden bg-muted shrink-0 ring-1 ring-border/60", dim)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Package className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      {items.length > 1 && (
        <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
          +{items.length - 1}
        </span>
      )}
    </div>
  );
}

function AdminOrderDetail({
  order,
  busy,
  onStatusChange,
}: {
  order: OrderDetail;
  busy: boolean;
  onStatusChange: (s: MrpapsOrderStatus) => void;
}) {
  return (
    <div className="space-y-6">
      <BotySurface className="p-6 md:p-8">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Pedido admin</p>
            <h2 className="font-serif text-3xl mt-1">#{order.orderNumber}</h2>
            <p className="text-sm mt-2">
              <a href={`mailto:${order.customer.email}`} className="text-primary hover:underline">
                {order.customer.email}
              </a>
              {" · "}
              {order.customer.phone}
            </p>
          </div>
          <div className="text-right space-y-2">
            <BotyBadge className={STATUS_BADGE[order.status]}>{ORDER_STATUS_LABELS[order.status]}</BotyBadge>
            {order.paymentStatus && (
              <BotyBadge className={PAYMENT_BADGE[order.paymentStatus] ?? "bg-muted text-muted-foreground"}>
                {PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}
              </BotyBadge>
            )}
            <p className="font-serif text-2xl text-primary tabular-nums">{formatMxn(order.totals.totalMxn)}</p>
          </div>
        </div>

        {(order.stripePaymentIntentId || order.paymentStatus) && (
          <BotySurface className="p-4 mt-6 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Stripe</p>
            {order.stripePaymentIntentId ? (
              <p className="text-sm font-mono break-all">
                PaymentIntent:{" "}
                <a
                  href={`https://dashboard.stripe.com/search?query=${encodeURIComponent(order.stripePaymentIntentId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {order.stripePaymentIntentId}
                </a>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin PaymentIntent — el cliente no llegó al paso de pago o Stripe no está configurado.
              </p>
            )}
          </BotySurface>
        )}

        <ol className="flex flex-wrap gap-4 mt-8">
          {order.timeline.map((step, idx) => (
            <li key={idx} className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  step.done ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {step.done ? <Check className="w-4 h-4" /> : <Circle className="w-3 h-3" />}
              </span>
              <span className={step.current ? "font-medium text-primary" : "text-muted-foreground"}>
                {step.label}
              </span>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-border/60">
          <span className="text-xs text-muted-foreground w-full mb-1">Cambiar estado</span>
          {(ORDER_STATUS_NEXT[order.status] ?? []).map((s) => (
            <BotyButton
              key={s}
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => onStatusChange(s)}
            >
              → {ORDER_STATUS_LABELS[s]}
            </BotyButton>
          ))}
        </div>
      </BotySurface>

      <div className="grid gap-6 lg:grid-cols-3">
        <BotySurface className="p-6 lg:col-span-2">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Artículos
          </h3>
          <ul className="space-y-4">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-4 pb-4 border-b border-border/40 last:border-0 last:pb-0">
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-muted shrink-0">
                  {item.thumbnailUrl ? (
                    <RemoteImage src={item.thumbnailUrl} alt="" fill className="object-cover" sizes="96px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{item.productName}</p>
                  <p className="text-sm text-muted-foreground">{item.variantLabel}</p>
                  <p className="text-xs text-muted-foreground">SKU {item.sku}</p>
                  <p className="mt-2 text-sm">
                    {item.quantity} × {formatMxn(item.unitPriceMxn)} ={" "}
                    <strong>{formatMxn(item.lineTotalMxn)}</strong>
                  </p>
                  {item.printFileUrl && (
                    <a
                      href={item.printFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Plano de impresión (300 DPI)
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </BotySurface>

        <div className="space-y-6">
          <BotySurface className="p-6">
            <h3 className="font-medium flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4" />
              Envío
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {order.customer.name}
              <br />
              {order.shipping.address1}
              {order.shipping.address2 && `, ${order.shipping.address2}`}
              <br />
              {order.shipping.city}, {mxStateLabel(order.shipping.stateCode)} {order.shipping.zip}
            </p>
            {order.tracking.url && (
              <a
                href={order.tracking.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 text-sm text-primary"
              >
                <Truck className="w-4 h-4" />
                Rastreo
              </a>
            )}
          </BotySurface>

          <BotySurface className="p-6 text-sm space-y-2">
            <p className="font-medium mb-2">Totales</p>
            <p>Subtotal: {formatMxn(order.totals.subtotalMxn)}</p>
            <p>Envío: {formatMxn(order.totals.shippingMxn)}</p>
            <p>IVA: {formatMxn(order.totals.taxMxn)}</p>
            <p className="font-semibold text-primary pt-2">Total: {formatMxn(order.totals.totalMxn)}</p>
          </BotySurface>

          {order.internalNotes && (
            <BotySurface className="p-6">
              <p className="text-xs font-medium text-muted-foreground mb-2">Notas internas</p>
              <p className="text-sm whitespace-pre-wrap">{order.internalNotes}</p>
            </BotySurface>
          )}
        </div>
      </div>
    </div>
  );
}
