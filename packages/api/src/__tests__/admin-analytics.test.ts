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
  it('agrega métricas de resumen y series', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([
        {
          paid_orders: '2',
          revenue_mxn: '1000.00',
          refunded_orders: '0',
          cancelled_orders: '1',
          unique_customers: '2',
        },
      ])
      .mockResolvedValueOnce([{ items_sold: '5' }])
      .mockResolvedValueOnce([
        { bucket: new Date('2026-01-01T00:00:00.000Z'), orders: '2', revenue_mxn: '1000' },
      ])
      .mockResolvedValueOnce([{ status: 'pedido', count: '2' }])
      .mockResolvedValueOnce([
        {
          product_name: 'Camiseta',
          variant_label: 'M / Negro',
          sku: 'CAM-M-BLK',
          quantity: '5',
          revenue_mxn: '1000',
        },
      ]);

    const data = await getAdminDashboard({ period: 'month' });

    expect(data.summary.paidOrders).toBe(2);
    expect(data.summary.revenueMxn).toBe('1000.00');
    expect(data.summary.avgOrderMxn).toBe('500.00');
    expect(data.series).toHaveLength(1);
    expect(data.topProducts[0]?.productName).toBe('Camiseta');
  });
});

describe('buildAnalyticsCsv', () => {
  it('incluye BOM y secciones del reporte', () => {
    const csv = buildAnalyticsCsv({
      period: { key: 'month', label: 'Último mes', from: '2026-01-01', to: '2026-01-31' },
      summary: {
        paidOrders: 1,
        revenueMxn: '500.00',
        avgOrderMxn: '500.00',
        itemsSold: 2,
        refundedOrders: 0,
        cancelledOrders: 0,
        uniqueCustomers: 1,
      },
      series: [{ bucket: 'x', label: '1 ene', orders: 1, revenueMxn: '500.00' }],
      byStatus: [{ status: 'pedido', count: 1 }],
      topProducts: [],
    });

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Pedidos pagados');
    expect(csv).toContain('Serie temporal');
  });
});
