import { query } from '../lib/db-helper.js';
import type { AdminAnalyticsQuery, AnalyticsPeriod } from '../schemas/admin-analytics.schema.js';

export type AnalyticsBucket = 'day' | 'week' | 'month';

export type ResolvedAnalyticsRange = {
  period: AnalyticsPeriod;
  label: string;
  from: string;
  to: string;
  fromIso: string;
  toExclusiveIso: string;
  bucket: AnalyticsBucket;
};

export type MarketAnalyticsSummary = {
  market: 'mx' | 'us';
  label: string;
  currency: 'MXN' | 'USD';
  paidOrders: number;
  revenue: string;
  avgOrder: string;
  itemsSold: number;
  uniqueCustomers: number;
  refundedOrders: number;
  cancelledOrders: number;
};

export type AdminDashboardDto = {
  period: { key: AnalyticsPeriod; label: string; from: string; to: string };
  /** Totales consolidados (conteos mezclan mercados; dinero separado por moneda). */
  summary: {
    paidOrders: number;
    revenueMxn: string;
    avgOrderMxn: string;
    revenueUsd: string;
    avgOrderUsd: string;
    itemsSold: number;
    refundedOrders: number;
    cancelledOrders: number;
    uniqueCustomers: number;
  };
  /** Desglose por sucursal / mercado (MX y US). */
  byMarket: MarketAnalyticsSummary[];
  series: Array<{
    bucket: string;
    label: string;
    orders: number;
    revenueMxn: string;
    revenueUsd: string;
  }>;
  byStatus: Array<{ status: string; count: number }>;
  topProducts: Array<{
    productName: string;
    variantLabel: string;
    sku: string;
    quantity: number;
    currency: 'MXN' | 'USD';
    revenue: string;
    /** @deprecated compat — mismos que revenue si currency=MXN */
    revenueMxn: string;
  }>;
};

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  week: 'Últimos 7 días',
  month: 'Últimos 30 días',
  quarter: 'Últimos 3 meses',
  year: 'Último año',
  custom: 'Fechas elegidas',
};

const EMPTY_MARKET: Record<'MXN' | 'USD', MarketAnalyticsSummary> = {
  MXN: {
    market: 'mx',
    label: 'México',
    currency: 'MXN',
    paidOrders: 0,
    revenue: '0.00',
    avgOrder: '0.00',
    itemsSold: 0,
    uniqueCustomers: 0,
    refundedOrders: 0,
    cancelledOrders: 0,
  },
  USD: {
    market: 'us',
    label: 'Estados Unidos',
    currency: 'USD',
    paidOrders: 0,
    revenue: '0.00',
    avgOrder: '0.00',
    itemsSold: 0,
    uniqueCustomers: 0,
    refundedOrders: 0,
    cancelledOrders: 0,
  },
};

function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDaysUtc(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function pickBucket(daySpan: number): AnalyticsBucket {
  if (daySpan <= 31) return 'day';
  if (daySpan <= 120) return 'week';
  return 'month';
}

export function resolveAnalyticsRange(input: AdminAnalyticsQuery): ResolvedAnalyticsRange {
  const today = startOfDayUtc(new Date());
  const tomorrow = addDaysUtc(today, 1);

  let from: Date;
  let toExclusive: Date;
  let period = input.period;

  if (period === 'custom') {
    from = startOfDayUtc(new Date(`${input.from!}T00:00:00.000Z`));
    toExclusive = addDaysUtc(startOfDayUtc(new Date(`${input.to!}T00:00:00.000Z`)), 1);
  } else if (period === 'week') {
    from = addDaysUtc(today, -6);
    toExclusive = tomorrow;
  } else if (period === 'month') {
    from = addDaysUtc(today, -29);
    toExclusive = tomorrow;
  } else if (period === 'quarter') {
    from = addDaysUtc(today, -89);
    toExclusive = tomorrow;
  } else {
    from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1));
    toExclusive = tomorrow;
  }

  const daySpan = Math.max(
    1,
    Math.ceil((toExclusive.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)),
  );

  return {
    period,
    label: PERIOD_LABELS[period],
    from: formatDateOnly(from),
    to: formatDateOnly(addDaysUtc(toExclusive, -1)),
    fromIso: from.toISOString(),
    toExclusiveIso: toExclusive.toISOString(),
    bucket: pickBucket(daySpan),
  };
}

function bucketLabel(bucket: Date, granularity: AnalyticsBucket): string {
  if (granularity === 'day') {
    return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(bucket);
  }
  if (granularity === 'week') {
    return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(bucket);
  }
  return new Intl.DateTimeFormat('es-MX', { month: 'short', year: 'numeric' }).format(bucket);
}

function money(value: string | number): string {
  return Number(value).toFixed(2);
}

function buildMarketSummary(
  currency: 'MXN' | 'USD',
  row: {
    paid_orders: string;
    revenue: string;
    refunded_orders: string;
    cancelled_orders: string;
    unique_customers: string;
    items_sold: string;
  } | undefined,
): MarketAnalyticsSummary {
  const base = EMPTY_MARKET[currency];
  const paidOrders = Number(row?.paid_orders ?? 0);
  const revenue = Number(row?.revenue ?? 0);
  return {
    ...base,
    paidOrders,
    revenue: money(revenue),
    avgOrder: paidOrders > 0 ? money(revenue / paidOrders) : '0.00',
    itemsSold: Number(row?.items_sold ?? 0),
    uniqueCustomers: Number(row?.unique_customers ?? 0),
    refundedOrders: Number(row?.refunded_orders ?? 0),
    cancelledOrders: Number(row?.cancelled_orders ?? 0),
  };
}

export async function getAdminDashboard(input: AdminAnalyticsQuery): Promise<AdminDashboardDto> {
  const range = resolveAnalyticsRange(input);
  const trunc = range.bucket;

  const marketRows = await query<{
    currency: 'MXN' | 'USD';
    paid_orders: string;
    revenue: string;
    refunded_orders: string;
    cancelled_orders: string;
    unique_customers: string;
  }>(
    `SELECT
       currency,
       COUNT(*) FILTER (WHERE payment_status = 'paid')::text AS paid_orders,
       COALESCE(
         SUM(
           CASE
             WHEN payment_status = 'paid' AND currency = 'USD' THEN total_usd
             WHEN payment_status = 'paid' THEN total_mxn
             ELSE 0
           END
         ),
         0
       )::text AS revenue,
       COUNT(*) FILTER (WHERE payment_status = 'refunded')::text AS refunded_orders,
       COUNT(*) FILTER (WHERE status = 'cancelado')::text AS cancelled_orders,
       COUNT(DISTINCT lower(customer_email)) FILTER (WHERE payment_status = 'paid')::text AS unique_customers
     FROM mrpaps_orders
     WHERE ordered_at >= $1::timestamptz
       AND ordered_at < $2::timestamptz
       AND status <> 'pendiente_pago'
       AND currency IN ('MXN', 'USD')
     GROUP BY currency`,
    [range.fromIso, range.toExclusiveIso],
  );

  const itemsByCurrency = await query<{ currency: 'MXN' | 'USD'; items_sold: string }>(
    `SELECT o.currency, COALESCE(SUM(oi.quantity), 0)::text AS items_sold
     FROM mrpaps_order_items oi
     INNER JOIN mrpaps_orders o ON o.id = oi.order_id
     WHERE o.payment_status = 'paid'
       AND o.ordered_at >= $1::timestamptz
       AND o.ordered_at < $2::timestamptz
       AND o.currency IN ('MXN', 'USD')
     GROUP BY o.currency`,
    [range.fromIso, range.toExclusiveIso],
  );

  const itemsMap = new Map(itemsByCurrency.map((r) => [r.currency, r.items_sold]));
  const byCurrency = new Map(
    marketRows.map((r) => [
      r.currency,
      { ...r, items_sold: itemsMap.get(r.currency) ?? '0' },
    ]),
  );
  // Mercado sin pedidos en el periodo: aún mostrar 0 con piezas si las hubiera (raro)
  for (const cur of ['MXN', 'USD'] as const) {
    if (!byCurrency.has(cur) && itemsMap.has(cur)) {
      byCurrency.set(cur, {
        currency: cur,
        paid_orders: '0',
        revenue: '0',
        refunded_orders: '0',
        cancelled_orders: '0',
        unique_customers: '0',
        items_sold: itemsMap.get(cur)!,
      });
    }
  }

  const mx = buildMarketSummary('MXN', byCurrency.get('MXN'));
  const us = buildMarketSummary('USD', byCurrency.get('USD'));
  const byMarket = [mx, us];

  const paidOrders = mx.paidOrders + us.paidOrders;
  const itemsSold = mx.itemsSold + us.itemsSold;
  const refundedOrders = mx.refundedOrders + us.refundedOrders;
  const cancelledOrders = mx.cancelledOrders + us.cancelledOrders;

  const uniqueRows = await query<{ unique_customers: string }>(
    `SELECT COUNT(DISTINCT lower(customer_email)) FILTER (WHERE payment_status = 'paid')::text AS unique_customers
     FROM mrpaps_orders
     WHERE ordered_at >= $1::timestamptz
       AND ordered_at < $2::timestamptz
       AND status <> 'pendiente_pago'`,
    [range.fromIso, range.toExclusiveIso],
  );

  const seriesRows = await query<{
    bucket: Date;
    orders: string;
    revenue_mxn: string;
    revenue_usd: string;
  }>(
    `SELECT
       date_trunc($3, ordered_at AT TIME ZONE 'UTC') AS bucket,
       COUNT(*) FILTER (WHERE payment_status = 'paid')::text AS orders,
       COALESCE(SUM(total_mxn) FILTER (WHERE payment_status = 'paid' AND currency = 'MXN'), 0)::text AS revenue_mxn,
       COALESCE(SUM(total_usd) FILTER (WHERE payment_status = 'paid' AND currency = 'USD'), 0)::text AS revenue_usd
     FROM mrpaps_orders
     WHERE ordered_at >= $1::timestamptz
       AND ordered_at < $2::timestamptz
       AND status <> 'pendiente_pago'
     GROUP BY 1
     ORDER BY 1`,
    [range.fromIso, range.toExclusiveIso, trunc],
  );

  const statusRows = await query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::text AS count
     FROM mrpaps_orders
     WHERE ordered_at >= $1::timestamptz
       AND ordered_at < $2::timestamptz
       AND payment_status = 'paid'
     GROUP BY status
     ORDER BY count DESC`,
    [range.fromIso, range.toExclusiveIso],
  );

  const topRows = await query<{
    product_name: string;
    variant_label: string;
    sku: string;
    currency: 'MXN' | 'USD';
    quantity: string;
    revenue: string;
  }>(
    `SELECT
       oi.product_name,
       oi.variant_label,
       oi.sku,
       o.currency,
       SUM(oi.quantity)::text AS quantity,
       SUM(
         oi.quantity * CASE
           WHEN o.currency = 'USD' THEN COALESCE(oi.unit_price_usd, 0)
           ELSE oi.unit_price_mxn
         END
       )::text AS revenue
     FROM mrpaps_order_items oi
     INNER JOIN mrpaps_orders o ON o.id = oi.order_id
     WHERE o.payment_status = 'paid'
       AND o.ordered_at >= $1::timestamptz
       AND o.ordered_at < $2::timestamptz
     GROUP BY oi.product_name, oi.variant_label, oi.sku, o.currency
     ORDER BY SUM(oi.quantity) DESC, SUM(
       oi.quantity * CASE
         WHEN o.currency = 'USD' THEN COALESCE(oi.unit_price_usd, 0)
         ELSE oi.unit_price_mxn
       END
     ) DESC
     LIMIT 15`,
    [range.fromIso, range.toExclusiveIso],
  );

  return {
    period: {
      key: range.period,
      label: range.label,
      from: range.from,
      to: range.to,
    },
    summary: {
      paidOrders,
      revenueMxn: mx.revenue,
      avgOrderMxn: mx.avgOrder,
      revenueUsd: us.revenue,
      avgOrderUsd: us.avgOrder,
      itemsSold,
      refundedOrders,
      cancelledOrders,
      uniqueCustomers: Number(uniqueRows[0]?.unique_customers ?? 0),
    },
    byMarket,
    series: seriesRows.map((row) => ({
      bucket: row.bucket.toISOString(),
      label: bucketLabel(row.bucket, range.bucket),
      orders: Number(row.orders),
      revenueMxn: money(row.revenue_mxn),
      revenueUsd: money(row.revenue_usd),
    })),
    byStatus: statusRows.map((row) => ({
      status: row.status,
      count: Number(row.count),
    })),
    topProducts: topRows.map((row) => {
      const revenue = money(row.revenue);
      return {
        productName: row.product_name,
        variantLabel: row.variant_label,
        sku: row.sku,
        quantity: Number(row.quantity),
        currency: row.currency,
        revenue,
        revenueMxn: row.currency === 'MXN' ? revenue : '0.00',
      };
    }),
  };
}
