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

export type AdminDashboardDto = {
  period: { key: AnalyticsPeriod; label: string; from: string; to: string };
  summary: {
    paidOrders: number;
    revenueMxn: string;
    avgOrderMxn: string;
    itemsSold: number;
    refundedOrders: number;
    cancelledOrders: number;
    uniqueCustomers: number;
  };
  series: Array<{ bucket: string; label: string; orders: number; revenueMxn: string }>;
  byStatus: Array<{ status: string; count: number }>;
  topProducts: Array<{
    productName: string;
    variantLabel: string;
    sku: string;
    quantity: number;
    revenueMxn: string;
  }>;
};

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  week: 'Última semana',
  month: 'Último mes',
  quarter: 'Último trimestre',
  year: 'Último año',
  custom: 'Rango personalizado',
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

function toMxn(value: string | number): string {
  return Number(value).toFixed(2);
}

export async function getAdminDashboard(input: AdminAnalyticsQuery): Promise<AdminDashboardDto> {
  const range = resolveAnalyticsRange(input);
  const trunc = range.bucket;

  const summaryRows = await query<{
    paid_orders: string;
    revenue_mxn: string;
    refunded_orders: string;
    cancelled_orders: string;
    unique_customers: string;
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE payment_status = 'paid')::text AS paid_orders,
       COALESCE(SUM(total_mxn) FILTER (WHERE payment_status = 'paid'), 0)::text AS revenue_mxn,
       COUNT(*) FILTER (WHERE payment_status = 'refunded')::text AS refunded_orders,
       COUNT(*) FILTER (WHERE status = 'cancelado')::text AS cancelled_orders,
       COUNT(DISTINCT lower(customer_email)) FILTER (WHERE payment_status = 'paid')::text AS unique_customers
     FROM mrpaps_orders
     WHERE ordered_at >= $1::timestamptz
       AND ordered_at < $2::timestamptz
       AND status <> 'pendiente_pago'`,
    [range.fromIso, range.toExclusiveIso],
  );

  const itemsRows = await query<{ items_sold: string }>(
    `SELECT COALESCE(SUM(oi.quantity), 0)::text AS items_sold
     FROM mrpaps_order_items oi
     INNER JOIN mrpaps_orders o ON o.id = oi.order_id
     WHERE o.payment_status = 'paid'
       AND o.ordered_at >= $1::timestamptz
       AND o.ordered_at < $2::timestamptz`,
    [range.fromIso, range.toExclusiveIso],
  );

  const seriesRows = await query<{ bucket: Date; orders: string; revenue_mxn: string }>(
    `SELECT
       date_trunc($3, ordered_at AT TIME ZONE 'UTC') AS bucket,
       COUNT(*) FILTER (WHERE payment_status = 'paid')::text AS orders,
       COALESCE(SUM(total_mxn) FILTER (WHERE payment_status = 'paid'), 0)::text AS revenue_mxn
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
    quantity: string;
    revenue_mxn: string;
  }>(
    `SELECT
       oi.product_name,
       oi.variant_label,
       oi.sku,
       SUM(oi.quantity)::text AS quantity,
       SUM(oi.quantity * oi.unit_price_mxn)::text AS revenue_mxn
     FROM mrpaps_order_items oi
     INNER JOIN mrpaps_orders o ON o.id = oi.order_id
     WHERE o.payment_status = 'paid'
       AND o.ordered_at >= $1::timestamptz
       AND o.ordered_at < $2::timestamptz
     GROUP BY oi.product_name, oi.variant_label, oi.sku
     ORDER BY SUM(oi.quantity * oi.unit_price_mxn) DESC
     LIMIT 15`,
    [range.fromIso, range.toExclusiveIso],
  );

  const summary = summaryRows[0];
  const paidOrders = Number(summary?.paid_orders ?? 0);
  const revenue = Number(summary?.revenue_mxn ?? 0);

  return {
    period: {
      key: range.period,
      label: range.label,
      from: range.from,
      to: range.to,
    },
    summary: {
      paidOrders,
      revenueMxn: toMxn(revenue),
      avgOrderMxn: paidOrders > 0 ? toMxn(revenue / paidOrders) : '0.00',
      itemsSold: Number(itemsRows[0]?.items_sold ?? 0),
      refundedOrders: Number(summary?.refunded_orders ?? 0),
      cancelledOrders: Number(summary?.cancelled_orders ?? 0),
      uniqueCustomers: Number(summary?.unique_customers ?? 0),
    },
    series: seriesRows.map((row) => ({
      bucket: row.bucket.toISOString(),
      label: bucketLabel(row.bucket, range.bucket),
      orders: Number(row.orders),
      revenueMxn: toMxn(row.revenue_mxn),
    })),
    byStatus: statusRows.map((row) => ({
      status: row.status,
      count: Number(row.count),
    })),
    topProducts: topRows.map((row) => ({
      productName: row.product_name,
      variantLabel: row.variant_label,
      sku: row.sku,
      quantity: Number(row.quantity),
      revenueMxn: toMxn(row.revenue_mxn),
    })),
  };
}
