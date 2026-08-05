import PDFDocument from 'pdfkit';
import type { AdminDashboardDto } from './admin-analytics.service.js';

function csvEscape(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvLine(cells: Array<string | number>): string {
  return cells.map(csvEscape).join(',');
}

export function buildAnalyticsCsv(data: AdminDashboardDto): string {
  const lines: string[] = [];
  const bom = '\uFEFF';

  lines.push(csvLine(['Reporte Mr. Paps — Ventas']));
  lines.push(csvLine(['Periodo', data.period.label]));
  lines.push(csvLine(['Desde', data.period.from]));
  lines.push(csvLine(['Hasta', data.period.to]));
  lines.push('');

  lines.push(csvLine(['Resumen general']));
  lines.push(csvLine(['Pedidos pagados', data.summary.paidOrders]));
  lines.push(csvLine(['Ingresos MXN', data.summary.revenueMxn]));
  lines.push(csvLine(['Ticket promedio MXN', data.summary.avgOrderMxn]));
  lines.push(csvLine(['Ingresos USD', data.summary.revenueUsd]));
  lines.push(csvLine(['Ticket promedio USD', data.summary.avgOrderUsd]));
  lines.push(csvLine(['Artículos vendidos', data.summary.itemsSold]));
  lines.push(csvLine(['Clientes únicos', data.summary.uniqueCustomers]));
  lines.push(csvLine(['Reembolsos', data.summary.refundedOrders]));
  lines.push(csvLine(['Cancelados', data.summary.cancelledOrders]));
  lines.push('');

  lines.push(csvLine(['Por sucursal / mercado', 'Moneda', 'Pedidos', 'Ingresos', 'Ticket promedio', 'Piezas', 'Clientes']));
  for (const m of data.byMarket) {
    lines.push(
      csvLine([m.label, m.currency, m.paidOrders, m.revenue, m.avgOrder, m.itemsSold, m.uniqueCustomers]),
    );
  }
  lines.push('');

  lines.push(csvLine(['Serie temporal', 'Pedidos', 'Ingresos MXN', 'Ingresos USD']));
  for (const row of data.series) {
    lines.push(csvLine([row.label, row.orders, row.revenueMxn, row.revenueUsd]));
  }
  lines.push('');

  lines.push(csvLine(['Estado', 'Pedidos']));
  for (const row of data.byStatus) {
    lines.push(csvLine([row.status, row.count]));
  }
  lines.push('');

  lines.push(csvLine(['Producto', 'Variante', 'SKU', 'Moneda', 'Cantidad', 'Ingresos']));
  for (const row of data.topProducts) {
    lines.push(
      csvLine([row.productName, row.variantLabel, row.sku, row.currency, row.quantity, row.revenue]),
    );
  }

  return bom + lines.join('\r\n');
}

export async function buildAnalyticsPdf(data: AdminDashboardDto): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('Mr. Paps — Reporte de ventas', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#444');
    doc.text(`${data.period.label} (${data.period.from} → ${data.period.to})`);
    doc.moveDown();

    doc.fillColor('#000').fontSize(12).text('Resumen general', { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(10);
    const summaryLines = [
      `Pedidos pagados: ${data.summary.paidOrders}`,
      `Ingresos México: $${data.summary.revenueMxn} MXN`,
      `Ticket promedio MX: $${data.summary.avgOrderMxn} MXN`,
      `Ingresos EE.UU.: $${data.summary.revenueUsd} USD`,
      `Ticket promedio US: $${data.summary.avgOrderUsd} USD`,
      `Artículos vendidos: ${data.summary.itemsSold}`,
      `Clientes únicos: ${data.summary.uniqueCustomers}`,
      `Reembolsos: ${data.summary.refundedOrders}`,
      `Cancelados: ${data.summary.cancelledOrders}`,
    ];
    for (const line of summaryLines) doc.text(line);
    doc.moveDown();

    doc.fontSize(12).text('Por sucursal', { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(10);
    for (const m of data.byMarket) {
      doc.text(
        `${m.label} (${m.currency}): ${m.paidOrders} pedidos — $${m.revenue} — ${m.itemsSold} piezas`,
      );
    }
    doc.moveDown();

    doc.fontSize(12).text('Ingresos por periodo', { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(9);
    for (const row of data.series) {
      doc.text(
        `${row.label}: ${row.orders} pedidos — $${row.revenueMxn} MXN / $${row.revenueUsd} USD`,
      );
    }
    doc.moveDown();

    doc.fontSize(12).text('Top productos', { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(9);
    if (data.topProducts.length === 0) {
      doc.text('Sin ventas en el periodo.');
    } else {
      for (const row of data.topProducts) {
        doc.text(
          `${row.productName} (${row.variantLabel}) [${row.currency}] — ${row.quantity} uds — $${row.revenue}`,
        );
      }
    }

    doc.end();
  });
}
