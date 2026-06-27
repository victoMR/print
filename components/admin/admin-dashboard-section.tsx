"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminDownloadAnalyticsReport, adminFetchDashboard } from "@/lib/api";
import type { AdminAnalyticsPeriod, AdminDashboardData } from "@/lib/api-types";
import { ORDER_STATUS_LABELS, type MrpapsOrderStatus } from "@/lib/api-types";
import { cn, formatMxn } from "@/lib/utils";
import {
  BotyButton,
  BotyLabel,
  BotyPageHeader,
} from "@/components/boty/ui-patterns";
import { AdminSurface } from "@/components/admin/admin-grid-card";
import {
  CalendarDays,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Loader2,
  Package,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  UserRound,
  XCircle,
} from "lucide-react";

const PERIOD_OPTIONS: {
  value: AdminAnalyticsPeriod;
  label: string;
  hint: string;
}[] = [
  { value: "week", label: "7 días", hint: "La semana pasada hasta hoy" },
  { value: "month", label: "30 días", hint: "El último mes" },
  { value: "quarter", label: "3 meses", hint: "El último trimestre" },
  { value: "year", label: "12 meses", hint: "El último año" },
  { value: "custom", label: "Elegir fechas", hint: "Tú defines el rango" },
];

type AdminDashboardSectionProps = {
  onError: (msg: string | null) => void;
  refreshKey?: number;
};

function formatFriendlyDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  accent = "primary",
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof DollarSign;
  accent?: "primary" | "amber" | "muted";
}) {
  const accentClass =
    accent === "amber"
      ? "bg-amber-500/10 text-amber-800"
      : accent === "muted"
        ? "bg-[#EBE7DB] text-[#7A756E]"
        : "bg-[#5C1A24]/8 text-[#5C1A24]";

  return (
    <AdminSurface className="p-5">
      <div className="flex items-start gap-3">
        <div className={cn("w-10 h-10 flex items-center justify-center shrink-0", accentClass)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.18em] font-sans text-[#7A756E]">{title}</p>
          <p className="font-sans tabular-nums text-2xl sm:text-3xl mt-1 leading-tight text-[#2A2726]">{value}</p>
          <p className="text-xs text-[#7A756E] mt-2 leading-relaxed font-sans">{description}</p>
        </div>
      </div>
    </AdminSurface>
  );
}

function SalesChart({ series }: { series: AdminDashboardData["series"] }) {
  const maxRevenue = useMemo(
    () => Math.max(...series.map((s) => Number(s.revenueMxn)), 1),
    [series],
  );
  const totalRevenue = useMemo(
    () => series.reduce((sum, s) => sum + Number(s.revenueMxn), 0),
    [series],
  );
  const totalOrders = useMemo(
    () => series.reduce((sum, s) => sum + s.orders, 0),
    [series],
  );
  const showValuesOnBars = series.length <= 14;

  if (series.length === 0) {
    return (
      <div className="text-center py-14 px-4">
        <Package className="w-10 h-10 text-[#7A756E]/40 mx-auto mb-3" />
        <p className="text-sm font-medium text-[#2A2726]">Aún no hay ventas en estas fechas</p>
        <p className="text-xs text-[#7A756E] mt-1 max-w-xs mx-auto">
          Prueba otro rango de fechas o espera a que entren pedidos pagados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-sm">
        <p>
          <span className="text-[#7A756E]">Total en el gráfico: </span>
          <span className="font-semibold">{formatMxn(totalRevenue)}</span>
        </p>
        <p>
          <span className="text-[#7A756E]">Pedidos: </span>
          <span className="font-semibold">{totalOrders}</span>
        </p>
      </div>

      <div className="flex items-end gap-1.5 sm:gap-2 min-h-[200px] pt-2 pb-1">
        {series.map((row) => {
          const pct = (Number(row.revenueMxn) / maxRevenue) * 100;
          const hasSales = Number(row.revenueMxn) > 0;
          return (
            <div
              key={row.bucket}
              className="flex-1 min-w-0 flex flex-col items-center gap-1.5 h-[200px] justify-end"
            >
              {showValuesOnBars && hasSales && (
                <span className="text-[10px] sm:text-xs font-medium text-[#2A2726] text-center leading-tight px-0.5">
                  {formatMxn(row.revenueMxn)}
                </span>
              )}
              <div
                className={cn(
                  "w-full max-w-[52px] boty-transition",
                  hasSales ? "bg-[#5C1A24] hover:bg-[#4A1520]" : "bg-[#EBE7DB]",
                )}
                style={{ height: `${hasSales ? Math.max(pct, 8) : 4}%` }}
                title={`${row.label}: ${formatMxn(row.revenueMxn)} · ${row.orders} pedido${row.orders !== 1 ? "s" : ""}`}
              />
              <span className="text-[10px] sm:text-xs text-[#7A756E] text-center leading-tight w-full truncate px-0.5">
                {row.label}
              </span>
              {row.orders > 0 && (
                <span className="text-[10px] text-[#7A756E]/70">
                  {row.orders} ped.
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-[#7A756E]">
        Cada barra muestra cuánto dinero entró ese día o periodo. Solo cuenta pedidos ya pagados.
      </p>
    </div>
  );
}

export function AdminDashboardSection({ onError, refreshKey = 0 }: AdminDashboardSectionProps) {
  const [period, setPeriod] = useState<AdminAnalyticsPeriod>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  const selectedPeriodHint = PERIOD_OPTIONS.find((p) => p.value === period)?.hint ?? "";

  const load = useCallback(async () => {
    onError(null);
    setLoading(true);
    try {
      const res = await adminFetchDashboard({
        period,
        from: period === "custom" ? customFrom : undefined,
        to: period === "custom" ? customTo : undefined,
      });
      setData(res.data);
    } catch (err) {
      onError(err instanceof Error ? err.message : "No pudimos cargar el resumen de ventas");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo, onError]);

  useEffect(() => {
    if (period === "custom" && (!customFrom || !customTo)) {
      setLoading(false);
      setData(null);
      return;
    }
    void load();
  }, [load, refreshKey, period, customFrom, customTo]);

  async function handleExport(format: "csv" | "pdf") {
    if (period === "custom" && (!customFrom || !customTo)) {
      onError("Elige la fecha de inicio y la de fin para exportar");
      return;
    }
    setExporting(format);
    onError(null);
    try {
      await adminDownloadAnalyticsReport({
        period,
        format,
        from: period === "custom" ? customFrom : undefined,
        to: period === "custom" ? customTo : undefined,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo descargar el reporte");
    } finally {
      setExporting(null);
    }
  }

  const hasSales = data && data.summary.paidOrders > 0;

  return (
    <section className="space-y-6">
      <BotyPageHeader
        title="Resumen de ventas"
        description="Aquí ves cuánto vendiste, qué productos salen más y cómo van tus pedidos. Solo entran pedidos con pago confirmado."
      />

      <AdminSurface className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <CalendarDays className="w-5 h-5 text-[#5C1A24] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#2A2726]">¿Qué fechas quieres ver?</p>
            <p className="text-xs text-[#7A756E] mt-0.5">{selectedPeriodHint}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPeriod(opt.value)}
              className={cn(
                "px-4 py-2 text-[11px] tracking-[0.15em] uppercase font-sans boty-transition border",
                period === opt.value
                  ? "bg-[#2A2726] text-[#f8f9fa] border-[#2A2726]"
                  : "bg-white border-[#D4CFC5] text-[#7A756E] hover:border-[#2A2726] hover:text-[#2A2726]",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="flex flex-wrap gap-4 items-end pt-3 border-t border-[#D4CFC5]">
            <label className="flex flex-col gap-1.5 text-sm">
              <BotyLabel>Desde</BotyLabel>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="border border-[#D4CFC5] bg-white px-3 py-2 text-sm text-[#2A2726] focus:outline-none focus:border-[#5C1A24]"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <BotyLabel>Hasta</BotyLabel>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="border border-[#D4CFC5] bg-white px-3 py-2 text-sm text-[#2A2726] focus:outline-none focus:border-[#5C1A24]"
              />
            </label>
            {(!customFrom || !customTo) && (
              <p className="text-xs text-[#7A756E] pb-2">
                Selecciona ambas fechas para ver el reporte.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-3 border-t border-[#D4CFC5]">
          <BotyButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={loading || exporting !== null || (period === "custom" && (!customFrom || !customTo))}
            onClick={() => void handleExport("csv")}
          >
            {exporting === "csv" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            Descargar Excel
          </BotyButton>
          <BotyButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={loading || exporting !== null || (period === "custom" && (!customFrom || !customTo))}
            onClick={() => void handleExport("pdf")}
          >
            {exporting === "pdf" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            Descargar PDF
          </BotyButton>
        </div>
      </AdminSurface>

      {loading && (
        <div className="flex flex-col items-center justify-center gap-2 text-[#7A756E] text-sm py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#5C1A24]" />
          <p>Calculando tus ventas…</p>
        </div>
      )}

      {!loading && period === "custom" && (!customFrom || !customTo) && (
        <AdminSurface className="p-10 text-center">
          <CalendarDays className="w-10 h-10 text-[#7A756E]/50 mx-auto mb-3" />
          <p className="font-medium text-[#2A2726]">Elige un rango de fechas</p>
          <p className="text-sm text-[#7A756E] mt-1 max-w-sm mx-auto">
            Arriba puedes poner desde qué día hasta qué día quieres el resumen.
          </p>
        </AdminSurface>
      )}

      {!loading && data && (
        <>
          {/* Revenue hero card */}
          <AdminSurface className="p-6 sm:p-8 bg-[#2A2726]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] font-sans text-[#f8f9fa]/50 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#f8f9fa]/40" />
                  {data.period.label}
                </p>
                <p className="text-xs text-[#f8f9fa]/40 mt-1">
                  Del {formatFriendlyDate(data.period.from)} al {formatFriendlyDate(data.period.to)}
                </p>
                <p className="font-sans tabular-nums text-3xl sm:text-4xl mt-3 text-[#f8f9fa]">
                  {formatMxn(data.summary.revenueMxn)}
                </p>
                <p className="text-sm text-[#f8f9fa]/55 mt-2">
                  {hasSales ? (
                    <>
                      <span className="text-[#f8f9fa]">{data.summary.paidOrders}</span>
                      {data.summary.paidOrders === 1 ? " pedido pagado" : " pedidos pagados"}
                      {data.summary.itemsSold > 0 && (
                        <> · <span className="text-[#f8f9fa]">{data.summary.itemsSold}</span> artículos</>
                      )}
                    </>
                  ) : (
                    "Sin ventas pagadas en este periodo"
                  )}
                </p>
              </div>
              {hasSales && (
                <div className="border border-[#f8f9fa]/15 px-4 py-3 text-sm">
                  <p className="text-[#f8f9fa]/45 text-[10px] uppercase tracking-[0.18em] font-sans">Promedio por pedido</p>
                  <p className="font-sans tabular-nums text-xl mt-1 text-[#f8f9fa]">{formatMxn(data.summary.avgOrderMxn)}</p>
                </div>
              )}
            </div>
          </AdminSurface>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Dinero cobrado"
              value={formatMxn(data.summary.revenueMxn)}
              description={`Suma de ${data.summary.paidOrders} pedido${data.summary.paidOrders !== 1 ? "s" : ""} con pago confirmado en Stripe.`}
              icon={DollarSign}
            />
            <KpiCard
              title="Promedio por pedido"
              value={formatMxn(data.summary.avgOrderMxn)}
              description="Cuánto gasta en promedio cada cliente por compra."
              icon={ShoppingBag}
            />
            <KpiCard
              title="Piezas vendidas"
              value={String(data.summary.itemsSold)}
              description={`${data.summary.uniqueCustomers} cliente${data.summary.uniqueCustomers !== 1 ? "s" : ""} distinto${data.summary.uniqueCustomers !== 1 ? "s" : ""} compró en este periodo.`}
              icon={Package}
            />
            <KpiCard
              title="Devoluciones"
              value={String(data.summary.refundedOrders)}
              description={
                data.summary.refundedOrders > 0
                  ? "Pedidos donde se reembolsó al cliente."
                  : "Ningún reembolso en este periodo."
              }
              icon={RotateCcw}
              accent={data.summary.refundedOrders > 0 ? "amber" : "muted"}
            />
          </div>

          {data.summary.cancelledOrders > 0 && (
            <div className="px-4 py-3 flex items-center gap-3 text-sm border border-amber-500/25 bg-amber-500/5">
              <XCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <p className="text-[#2A2726]">
                <span className="font-medium">{data.summary.cancelledOrders}</span>
                {data.summary.cancelledOrders === 1 ? " pedido cancelado" : " pedidos cancelados"} en estas fechas.
              </p>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            <AdminSurface className="p-5 sm:p-6 lg:col-span-2">
              <h2 className="font-serif text-xl text-[#2A2726]">¿Cómo fueron las ventas día a día?</h2>
              <p className="text-xs text-[#7A756E] mt-1 mb-5 uppercase tracking-[0.15em] font-sans">
                Barras más altas = más dinero entró ese día o semana.
              </p>
              <SalesChart series={data.series} />
            </AdminSurface>

            <AdminSurface className="p-5 sm:p-6">
              <h2 className="font-serif text-xl text-[#2A2726]">Estado de pedidos</h2>
              <p className="text-xs text-[#7A756E] mt-1 mb-5 uppercase tracking-[0.15em] font-sans">
                En qué paso del envío están.
              </p>
              {data.byStatus.length === 0 ? (
                <p className="text-sm text-[#7A756E]">No hay pedidos pagados en estas fechas.</p>
              ) : (
                <ul className="space-y-4">
                  {data.byStatus.map((row) => {
                    const total = data.byStatus.reduce((s, r) => s + r.count, 0);
                    const pct = total > 0 ? (row.count / total) * 100 : 0;
                    const label =
                      ORDER_STATUS_LABELS[row.status as MrpapsOrderStatus] ?? row.status;
                    return (
                      <li key={row.status}>
                        <div className="flex justify-between text-sm mb-1.5 gap-2">
                          <span className="font-medium text-[#2A2726]">{label}</span>
                          <span className="text-[#7A756E] shrink-0">
                            {row.count} ({Math.round(pct)}%)
                          </span>
                        </div>
                        <div className="h-1.5 bg-[#EBE7DB] overflow-hidden">
                          <div
                            className="h-full bg-[#5C1A24] boty-transition"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </AdminSurface>
          </div>

          <AdminSurface className="p-5 sm:p-6 overflow-hidden">
            <h2 className="font-serif text-xl text-[#2A2726]">Productos más vendidos</h2>
            <p className="text-xs text-[#7A756E] mt-1 mb-5 uppercase tracking-[0.15em] font-sans">
              Los que más dinero generaron en el periodo.
            </p>
            {data.topProducts.length === 0 ? (
              <div className="text-center py-10">
                <Package className="w-9 h-9 text-[#7A756E]/40 mx-auto mb-2" />
                <p className="text-sm text-[#7A756E]">Todavía no hay productos vendidos aquí.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.topProducts.map((row, index) => (
                  <div
                    key={`${row.sku}-${row.variantLabel}`}
                    className="flex items-center gap-4 p-4 border border-[#D4CFC5] hover:border-[#5C1A24]/30 boty-transition"
                  >
                    <span className="w-7 h-7 bg-[#2A2726] text-[#f8f9fa] text-xs font-sans flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#2A2726] truncate">{row.productName}</p>
                      <p className="text-xs text-[#7A756E] mt-0.5">
                        {row.variantLabel} · {row.quantity} pieza{row.quantity !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-sans tabular-nums text-base text-[#2A2726]">{formatMxn(row.revenueMxn)}</p>
                      <p className="text-[10px] text-[#7A756E] font-mono">{row.sku}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminSurface>

          <p className="text-xs text-center text-[#7A756E] flex items-center justify-center gap-1.5 pb-2 font-sans">
            <UserRound className="w-3.5 h-3.5" />
            Los montos no incluyen pedidos sin pagar ni carritos abandonados.
          </p>
        </>
      )}
    </section>
  );
}
