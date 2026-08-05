import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db-helper.js', () => ({
  query: vi.fn(),
}));

import { query } from '../lib/db-helper.js';
import {
  resolveAnalyticsRange,
  getAdminDashboard,
} from '../services/admin-analytics.service.js';
import { buildAnalyticsCsv } from '../services/admin-analytics-export.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resolveAnalyticsRange', () => {
  it('resuelve semana con bucket diario', () => {
    const range = resolveAnalyticsRange({ period: 'week' });
    expect(range.period).toBe('week');
    expect(range.bucket).toBe('day');
    expect(range.label).toBe('Últimos 7 días');
  });

  it('resuelve trimestre con bucket semanal', () => {
    const range = resolveAnalyticsRange({ period: 'quarter' });
    expect(range.bucket).toBe('week');
  });

  it('resuelve año con bucket mensual', () => {
    const range = resolveAnalyticsRange({ period: 'year' });
    expect(range.bucket).toBe('month');
  });

  it('resuelve rango personalizado', () => {
    const range = resolveAnalyticsRange({
      period: 'custom',
      from: '2026-01-01',
      to: '2026-01-15',
    });
    expect(range.from).toBe('2026-01-01');
    expect(range.to).toBe('2026-01-15');
    expect(range.bucket).toBe('day');
  });
});

describe('getAdminDashboard', () => {
  it('agrega métricas generales y por mercado', async () => {
    vi.mocked(query)
      // marketRows
      .mockResolvedValueOnce([
        {
          currency: 'MXN',
          paid_orders: '2',
          revenue: '1000.00',
          refunded_orders: '0',
          cancelled_orders: '1',
          unique_customers: '2',
        },
        {
          currency: 'USD',
          paid_orders: '1',
          revenue: '40.00',
          refunded_orders: '0',
          cancelled_orders: '0',
          unique_customers: '1',
        },
      ])
      // itemsByCurrency
      .mockResolvedValueOnce([
        { currency: 'MXN', items_sold: '5' },
        { currency: 'USD', items_sold: '2' },
      ])
      // unique customers global
      .mockResolvedValueOnce([{ unique_customers: '3' }])
      // series
      .mockResolvedValueOnce([
        {
          bucket: new Date('2026-01-01T00:00:00.000Z'),
          orders: '3',
          revenue_mxn: '1000',
          revenue_usd: '40',
        },
      ])
      // byStatus
      .mockResolvedValueOnce([{ status: 'pedido', count: '3' }])
      // topProducts
      .mockResolvedValueOnce([
        {
          product_name: 'Camiseta',
          variant_label: 'M / Negro',
          sku: 'CAM-M-BLK',
          currency: 'MXN',
          quantity: '5',
          revenue: '1000',
        },
      ]);

    const data = await getAdminDashboard({ period: 'month' });

    expect(data.summary.paidOrders).toBe(3);
    expect(data.summary.revenueMxn).toBe('1000.00');
    expect(data.summary.revenueUsd).toBe('40.00');
    expect(data.summary.avgOrderMxn).toBe('500.00');
    expect(data.summary.avgOrderUsd).toBe('40.00');
    expect(data.summary.itemsSold).toBe(7);
    expect(data.summary.uniqueCustomers).toBe(3);
    expect(data.byMarket).toHaveLength(2);
    expect(data.byMarket[0]?.market).toBe('mx');
    expect(data.byMarket[0]?.paidOrders).toBe(2);
    expect(data.byMarket[1]?.market).toBe('us');
    expect(data.byMarket[1]?.revenue).toBe('40.00');
    expect(data.series[0]?.revenueUsd).toBe('40.00');
    expect(data.topProducts[0]?.currency).toBe('MXN');
  });
});

describe('buildAnalyticsCsv', () => {
  it('incluye BOM, general y por sucursal', () => {
    const csv = buildAnalyticsCsv({
      period: { key: 'month', label: 'Último mes', from: '2026-01-01', to: '2026-01-31' },
      summary: {
        paidOrders: 2,
        revenueMxn: '500.00',
        avgOrderMxn: '500.00',
        revenueUsd: '20.00',
        avgOrderUsd: '20.00',
        itemsSold: 3,
        refundedOrders: 0,
        cancelledOrders: 0,
        uniqueCustomers: 2,
      },
      byMarket: [
        {
          market: 'mx',
          label: 'México',
          currency: 'MXN',
          paidOrders: 1,
          revenue: '500.00',
          avgOrder: '500.00',
          itemsSold: 2,
          uniqueCustomers: 1,
          refundedOrders: 0,
          cancelledOrders: 0,
        },
        {
          market: 'us',
          label: 'Estados Unidos',
          currency: 'USD',
          paidOrders: 1,
          revenue: '20.00',
          avgOrder: '20.00',
          itemsSold: 1,
          uniqueCustomers: 1,
          refundedOrders: 0,
          cancelledOrders: 0,
        },
      ],
      series: [
        {
          bucket: 'x',
          label: '1 ene',
          orders: 2,
          revenueMxn: '500.00',
          revenueUsd: '20.00',
        },
      ],
      byStatus: [{ status: 'pedido', count: 2 }],
      topProducts: [],
    });

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Resumen general');
    expect(csv).toContain('Por sucursal');
    expect(csv).toContain('Ingresos USD');
    expect(csv).toContain('Serie temporal');
  });
});
