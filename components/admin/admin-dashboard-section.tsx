"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminDownloadAnalyticsReport,
  adminFetchDashboard,
} from "@/lib/api";
import type { AdminAnalyticsPeriod, AdminDashboardData } from "@/lib/api-types";
import { ORDER_STATUS_LABELS, type MrpapsOrderStatus } from "@/lib/api-types";
import { cn, formatMxn } from "@/lib/utils";
import {
  BotyButton,
  BotyLabel,
  BotySurface,
} from "@/components/boty/ui-patterns";
import {
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";

const PERIOD_OPTIONS: { value: AdminAnalyticsPeriod; label: string }[] = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
  { value: "quarter", label: "Trimestre" },
  { value: "year", label: "Año" },
  { value: "custom", label: "Personalizado" },
];

type AdminDashboardSectionProps = {
  onError: (msg: string | null) => void;
  refreshKey?: number;
};

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof DollarSign;
}) {
  return (
    <BotySurface className="p-5 flex gap-4 items-start">
      <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="font-serif text-2xl mt-1 truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </BotySurface>
  );
}

function RevenueChart({ series }: { series: AdminDashboardData["series"] }) {
  const max = useMemo(
    () => Math.max(...series.map((s) => Number(s.revenueMxn)), 1),
    [series],
  );

  if (series.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        Sin ventas en este periodo.
      </p>
    );
  }

  return (
    <div className="flex items-end gap-1 sm:gap-2 h-48 pt-4">
      {series.map((row) => {
        const pct = (Number(row.revenueMxn) / max) * 100;
        return (
          <div
            key={row.bucket}
            className="flex-1 min-w-0 flex flex-col items-center gap-2 h-full justify-end group"
            title={`${row.label}: ${formatMxn(row.revenueMxn)} (${row.orders} pedidos)`}
          >
            <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 boty-transition truncate max-w-full text-center">
              {formatMxn(row.revenueMxn)}
            </span>
            <div
              className="w-full max-w-[48px] rounded-t-lg bg-primary/80 group-hover:bg-primary boty-transition"
              style={{ height: `${Math.max(pct, 4)}%` }}
            />
            <span className="text-[10px] text-muted-foreground truncate max-w-full text-center leading-tight">
              {row.label}
            </span>
          </div>
        );
      })}
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
      onError(err instanceof Error ? err.message : "Error al cargar el dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo, onError]);

  useEffect(() => {
    if (period === "custom" && (!customFrom || !customTo)) return;
    void load();
  }, [load, refreshKey, period, customFrom, customTo]);

  async function handleExport(format: "csv" | "pdf") {
    if (period === "custom" && (!customFrom || !customTo)) {
      onError("Selecciona fechas de inicio y fin");
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
      onError(err instanceof Error ? err.message : "Error al exportar");
    } finally {
      setExporting(null);
    }
  }

  return (
    <section className="space-y-6">
      <BotySurface className="p-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Periodo</p>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPeriod(opt.value)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium boty-transition",
                  period === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div className="flex flex-wrap gap-3 items-end pt-1">
              <label className="flex flex-col gap-1.5 text-sm">
                <BotyLabel>Desde</BotyLabel>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <BotyLabel>Hasta</BotyLabel>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <BotyButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={loading || exporting !== null}
            onClick={() => void handleExport("csv")}
          >
            {exporting === "csv" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            Excel (CSV)
          </BotyButton>
          <BotyButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={loading || exporting !== null}
            onClick={() => void handleExport("pdf")}
          >
            {exporting === "pdf" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            PDF
          </BotyButton>
        </div>
      </BotySurface>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm py-20">
          <Loader2 className="w-4 h-4 animate-spin" />
          Cargando métricas…
        </div>
      )}

      {!loading && data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              {data.period.label} · {data.period.from} → {data.period.to}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Solo pedidos pagados en ingresos
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Ingresos"
              value={formatMxn(data.summary.revenueMxn)}
              sub={`${data.summary.paidOrders} pedidos pagados`}
              icon={DollarSign}
            />
            <KpiCard
              label="Ticket promedio"
              value={formatMxn(data.summary.avgOrderMxn)}
              icon={ShoppingBag}
            />
            <KpiCard
              label="Artículos vendidos"
              value={String(data.summary.itemsSold)}
              sub={`${data.summary.uniqueCustomers} clientes únicos`}
              icon={Package}
            />
            <KpiCard
              label="Reembolsos / cancelados"
              value={`${data.summary.refundedOrders} / ${data.summary.cancelledOrders}`}
              icon={Users}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <BotySurface className="p-5 lg:col-span-2">
              <h2 className="font-serif text-lg mb-1">Ingresos por periodo</h2>
              <p className="text-xs text-muted-foreground mb-4">Ventas confirmadas (MXN)</p>
              <RevenueChart series={data.series} />
            </BotySurface>

            <BotySurface className="p-5">
              <h2 className="font-serif text-lg mb-4">Por estado</h2>
              {data.byStatus.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos.</p>
              ) : (
                <ul className="space-y-3">
                  {data.byStatus.map((row) => {
                    const total = data.byStatus.reduce((s, r) => s + r.count, 0);
                    const pct = total > 0 ? (row.count / total) * 100 : 0;
                    const label =
                      ORDER_STATUS_LABELS[row.status as MrpapsOrderStatus] ?? row.status;
                    return (
                      <li key={row.status}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{label}</span>
                          <span className="text-muted-foreground">{row.count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary/70 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </BotySurface>
          </div>

          <BotySurface className="p-5 overflow-hidden">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-serif text-lg">Top productos</h2>
                <p className="text-xs text-muted-foreground">Por ingresos en el periodo</p>
              </div>
              <Download className="w-4 h-4 text-muted-foreground" aria-hidden />
            </div>
            {data.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sin ventas.</p>
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                      <th className="pb-2 font-medium">Producto</th>
                      <th className="pb-2 font-medium">SKU</th>
                      <th className="pb-2 font-medium text-right">Uds.</th>
                      <th className="pb-2 font-medium text-right">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {data.topProducts.map((row) => (
                      <tr key={`${row.sku}-${row.variantLabel}`}>
                        <td className="py-3 pr-4">
                          <p className="font-medium">{row.productName}</p>
                          <p className="text-xs text-muted-foreground">{row.variantLabel}</p>
                        </td>
                        <td className="py-3 text-muted-foreground font-mono text-xs">{row.sku}</td>
                        <td className="py-3 text-right">{row.quantity}</td>
                        <td className="py-3 text-right font-medium">{formatMxn(row.revenueMxn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </BotySurface>
        </>
      )}
    </section>
  );
}
