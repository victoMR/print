"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminFetchOrderDetail,
  adminListOrders,
  adminUpdateOrderStatus,
} from "@/lib/api";
import type { AdminOrderSummary, MrpapsOrderStatus, OrderDetail } from "@/lib/api-types";
import { ORDER_STATUS_LABELS, ORDER_STATUS_NEXT } from "@/lib/api-types";
import { cn, formatCurrency } from "@/lib/utils";

function orderAmount(order: { currency: "MXN" | "USD" }, mxn: string | null, usd: string | null): string {
  return formatCurrency((order.currency === "USD" ? usd : mxn) ?? "0", order.currency);
}
import {
  BotyBadge,
  BotyButton,
  BotyLabel,
  BotySurface,
} from "@/components/boty/ui-patterns";
import { AdminSelect } from "@/components/admin/admin-select";
import { AdminViewToggle, useAdminViewMode } from "@/components/admin/admin-view-toggle";
import {
  ADMIN_EMPTY_SURFACE_CLASS,
  ADMIN_FILTER_SURFACE_CLASS,
  ADMIN_GRID_CLASS,
} from "@/components/admin/admin-grid-card";
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

// ---------------------------------------------------------------------------
// TrackingModal — reemplaza window.prompt() para capturar datos de envío
// ---------------------------------------------------------------------------
type TrackingData = {
  trackingNumber: string;
  trackingUrl: string;
  carrier: string;
};

type TrackingModalProps = {
  open: boolean;
  onConfirm: (data: TrackingData) => void;
  onCancel: () => void;
};

function TrackingModal({ open, onConfirm, onCancel }: TrackingModalProps) {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [carrier, setCarrier] = useState("");

  useEffect(() => {
    if (open) {
      setTrackingNumber("");
      setTrackingUrl("");
      setCarrier("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-background border border-border rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Datos de envío</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1 hover:bg-muted transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="tracking-number" className="text-sm font-medium text-foreground/90">Número de guía</label>
            <input
              id="tracking-number"
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="1Z999AA10123456784"
              className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="tracking-url" className="text-sm font-medium text-foreground/90">
              URL de rastreo <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <input
              id="tracking-url"
              type="url"
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              placeholder="https://tracking.ups.com/..."
              className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="carrier" className="text-sm font-medium text-foreground/90">
              Paquetería <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <input
              id="carrier"
              type="text"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="UPS, FedEx, DHL, Estafeta..."
              className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <BotyButton type="button" variant="secondary" className="flex-1" onClick={onCancel}>
            Cancelar
          </BotyButton>
          <BotyButton
            type="button"
            className="flex-1"
            onClick={() => onConfirm({ trackingNumber, trackingUrl, carrier })}
          >
            Marcar como enviado
          </BotyButton>
        </div>
      </div>
    </div>
  );
}

/** Operaciones admin: solo estados post-pago (pendiente_pago es invisible en el panel). */
const ADMIN_ORDER_STATUSES: MrpapsOrderStatus[] = [
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
  const [viewMode, setViewMode] = useAdminViewMode("admin-orders-view", "list");
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const trackingResolverRef = useRef<((data: TrackingData | null) => void) | null>(null);
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

  function openTrackingModal(): Promise<TrackingData | null> {
    return new Promise((resolve) => {
      trackingResolverRef.current = resolve;
      setTrackingModalOpen(true);
    });
  }

  function handleTrackingConfirm(data: TrackingData) {
    setTrackingModalOpen(false);
    trackingResolverRef.current?.(data);
    trackingResolverRef.current = null;
  }

  function handleTrackingCancel() {
    setTrackingModalOpen(false);
    trackingResolverRef.current?.(null);
    trackingResolverRef.current = null;
  }

  async function handleStatusChange(status: MrpapsOrderStatus) {
    if (!selectedId) return;

    let trackingData: TrackingData | null = null;
    if (status === "enviado") {
      trackingData = await openTrackingModal();
      if (!trackingData) return; // usuario canceló
    }

    setBusy(true);
    onError(null);
    try {
      await adminUpdateOrderStatus(selectedId, {
        status,
        trackingNumber: trackingData?.trackingNumber || null,
        trackingUrl: trackingData?.trackingUrl || null,
        carrier: trackingData?.carrier || null,
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
      <>
        <TrackingModal
          open={trackingModalOpen}
          onConfirm={handleTrackingConfirm}
          onCancel={handleTrackingCancel}
        />
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
      </>
    );
  }

  return (
    <section className="space-y-6">
      <BotySurface className={ADMIN_FILTER_SURFACE_CLASS}>
        {/* Search bar */}
        <div className="relative flex-1 min-w-0 w-full lg:max-w-md xl:max-w-xl">
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
            placeholder="Pagados y en proceso"
            options={[
              { value: "__all__", label: "Pagados y en proceso" },
              ...ADMIN_ORDER_STATUSES.map((s) => ({ value: s, label: ORDER_STATUS_LABELS[s] })),
            ]}
          />
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto lg:ml-auto shrink-0">
          <AdminViewToggle value={viewMode} onChange={setViewMode} />
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 whitespace-nowrap ml-auto lg:ml-0">
            {listLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            {orders.length} pedido{orders.length !== 1 ? "s" : ""}
          </span>
        </div>
      </BotySurface>

      {orders.length === 0 ? (
        <BotySurface className={ADMIN_EMPTY_SURFACE_CLASS}>
          {searchQuery
            ? `No se encontraron pedidos para "${searchQuery}".`
            : "No hay pedidos con este filtro."}
        </BotySurface>
      ) : viewMode === "grid" ? (
        <ul className={ADMIN_GRID_CLASS}>
          {orders.map((order) => (
            <li key={order.publicId}>
              <OrderGridCard order={order} onOpen={() => void loadDetail(order.publicId)} />
            </li>
          ))}
        </ul>
      ) : (
        <BotySurface className="overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[auto_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto] gap-4 px-4 py-2.5 bg-muted/40 border-b border-border/50 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            <span className="w-10" aria-hidden />
            <span>Pedido / Cliente</span>
            <span>Estado</span>
            <span>Fecha</span>
            <span className="text-right pr-1">Total</span>
          </div>
          <div className="divide-y divide-border/50">
            {orders.map((order) => (
              <OrderListRow key={order.publicId} order={order} onOpen={() => void loadDetail(order.publicId)} />
            ))}
          </div>
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
      className="w-full text-left rounded-2xl border border-border/60 bg-card hover:border-primary/30 hover:shadow-sm boty-transition overflow-hidden"
    >
      <div className="p-4 space-y-2.5">
        <div className="flex items-start gap-3">
          <OrderThumb items={order.items} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-sans tabular-nums text-base leading-snug truncate">{order.orderNumber}</p>
            <p className="text-sm font-medium truncate">{order.customerName}</p>
            <p className="text-xs text-muted-foreground truncate">{order.customerEmail}</p>
          </div>
          <p className="font-semibold text-primary tabular-nums text-sm shrink-0">
            {orderAmount(order, order.totalMxn, order.totalUsd)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <OrderStatusBadges order={order} />
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(order.orderedAt).toLocaleDateString("es-MX")} · {order.itemCount}{" "}
          {order.itemCount === 1 ? "pieza" : "piezas"}
        </p>
      </div>
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
  const orderedLabel = new Date(order.orderedAt).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full text-left px-4 py-3 hover:bg-muted/30 boty-transition",
        "flex items-center gap-3",
        "md:grid md:items-center md:gap-4",
        "md:[grid-template-columns:auto_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto]",
      )}
    >
      <OrderThumb items={order.items} size="sm" />
      <div className="flex-1 min-w-0 md:contents">
        <div className="min-w-0">
          <p className="font-sans tabular-nums text-base truncate">{order.orderNumber}</p>
          <p className="text-sm truncate">{order.customerName}</p>
          <p className="text-xs text-muted-foreground truncate">{order.customerEmail}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-2 md:mt-0">
          <OrderStatusBadges order={order} />
        </div>
        <p className="text-xs text-muted-foreground whitespace-nowrap mt-1 md:mt-0">
          {orderedLabel}
          <span className="hidden sm:inline">
            {" "}
            · {order.itemCount} {order.itemCount === 1 ? "pza." : "pzas."}
          </span>
        </p>
        <p className="font-semibold text-primary tabular-nums text-sm md:text-base whitespace-nowrap md:text-right mt-1 md:mt-0">
          {orderAmount(order, order.totalMxn, order.totalUsd)}
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
  size?: "sm" | "md" | "fill";
}) {
  const thumb = items[0];

  if (size === "fill") {
    return (
      <div className="relative w-full h-full">
        {thumb?.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Package className="w-8 h-8 text-muted-foreground/60" />
          </div>
        )}
        {items.length > 1 && (
          <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
            +{items.length - 1}
          </span>
        )}
      </div>
    );
  }

  const dim = size === "sm" ? "w-10 h-10" : "w-14 h-14";
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
            <h2 className="font-sans tabular-nums text-3xl mt-1">#{order.orderNumber}</h2>
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
            <p className="font-sans tabular-nums text-2xl text-primary">{orderAmount(order, order.totals.totalMxn, order.totals.totalUsd)}</p>
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
                    {item.quantity} × {orderAmount(order, item.unitPriceMxn, item.unitPriceUsd)} ={" "}
                    <strong>{orderAmount(order, item.lineTotalMxn, item.lineTotalUsd)}</strong>
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
            <p>Subtotal: {orderAmount(order, order.totals.subtotalMxn, order.totals.subtotalUsd)}</p>
            <p>Envío: {orderAmount(order, order.totals.shippingMxn, order.totals.shippingUsd)}</p>
            <p>IVA: {orderAmount(order, order.totals.taxMxn, order.totals.taxUsd)}</p>
            <p className="font-semibold text-primary pt-2">Total: {orderAmount(order, order.totals.totalMxn, order.totals.totalUsd)}</p>
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
