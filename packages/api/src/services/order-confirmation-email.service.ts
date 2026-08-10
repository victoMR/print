import * as ordersRepo from '../db/mrpaps-orders.repository.js';
import type { MrpapsOrderWithItems } from '../db/mrpaps.types.js';
import { formatTrackingCodeDisplay } from '../lib/order-tracking-code.js';
import { isMailConfigured, sendMail, storefrontUrl } from '../lib/mail.js';
import { logger } from '../lib/logger.js';
import { sanitizeMailHeaderValue } from '../lib/sanitize-mail.js';

function formatAmount(amount: number | string | null, currency: 'MXN' | 'USD'): string {
  const value = typeof amount === 'string' ? Number.parseFloat(amount) : amount;
  if (value === null || !Number.isFinite(value)) return currency === 'USD' ? '$0.00 USD' : '$0.00 MXN';
  return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'es-MX', {
    style: 'currency',
    currency,
  }).format(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function buildOrderConfirmationContent(order: MrpapsOrderWithItems): {
  subject: string;
  html: string;
  text: string;
} {
  const trackingCode = sanitizeMailHeaderValue(formatTrackingCodeDisplay(order.public_id));
  const customerName = sanitizeMailHeaderValue(order.customer_name);
  const storeUrl = storefrontUrl();
  const isUs = order.currency === 'USD';
  const market = isUs ? 'us' : 'mx';
  const trackingUrl = `${storeUrl}/${market}/seguimiento`;
  const orderUrl = `${storeUrl}/${market}/pedido/${encodeURIComponent(order.public_id)}`;

  // Todo el correo se traduce por mercado — /us es un mercado angloparlante,
  // no solo una moneda distinta (ver taxLabel/deliveryEstimate, que ya
  // variaban antes de que se generalizara al resto del copy).
  const copy = isUs
    ? {
        lang: 'en',
        subject: `Thank you for your order — ${trackingCode}`,
        heading: 'Thank you for your order!',
        greeting: `Hi ${escapeHtml(customerName)}, we received your order and we're already working on it.`,
        trackingCodeLabel: 'Tracking code',
        trackingCodeNote: 'Keep it along with this email to check your order.',
        orderNumberLabel: 'Order number',
        shipToLabel: 'Shipping to',
        shippingMethodLabel: 'Shipping method',
        productHeader: 'Product',
        qtyHeader: 'Qty',
        totalHeader: 'Total',
        subtotalLabel: 'Subtotal',
        shippingLabel: 'Shipping',
        taxLabel: 'Sales tax',
        totalPaidLabel: 'Total paid',
        trackButtonLabel: 'Track my order',
        alsoAccess: (link: string) =>
          `You can also access <a href="${link}" style="color:#18181b;">your order</a> with the code and the email you used to purchase.`,
        deliveryEstimate: 'Estimated delivery time: 5–10 business days within the United States.',
        textHeading: 'Thank you for your order at Mr. Paps!',
        textGreeting: `Hi ${customerName},\n\nWe received your order and we're already working on it.`,
        textProductsLabel: 'Products:',
        textTrackAt: 'Track your order at:',
        textUseCode: `(Use the tracking code and this email: ${order.customer_email})`,
      }
    : {
        lang: 'es',
        subject: `Gracias por tu compra — ${trackingCode}`,
        heading: '¡Gracias por tu compra!',
        greeting: `Hola ${escapeHtml(customerName)}, recibimos tu pedido y ya estamos preparándolo.`,
        trackingCodeLabel: 'Código de seguimiento',
        trackingCodeNote: 'Guárdalo junto con este correo para consultar tu pedido.',
        orderNumberLabel: 'Pedido interno',
        shipToLabel: 'Envío a',
        shippingMethodLabel: 'Método de envío',
        productHeader: 'Producto',
        qtyHeader: 'Cant.',
        totalHeader: 'Total',
        subtotalLabel: 'Subtotal',
        shippingLabel: 'Envío',
        taxLabel: 'IVA',
        totalPaidLabel: 'Total pagado',
        trackButtonLabel: 'Consultar mi pedido',
        alsoAccess: (link: string) =>
          `También puedes entrar a <a href="${link}" style="color:#18181b;">tu pedido</a> con el código y el correo con el que compraste.`,
        deliveryEstimate: 'Tiempo estimado de entrega: 5–14 días hábiles en México.',
        textHeading: '¡Gracias por tu compra en Mr. Paps!',
        textGreeting: `Hola ${customerName},\n\nRecibimos tu pedido y ya estamos preparándolo.`,
        textProductsLabel: 'Productos:',
        textTrackAt: 'Consulta tu pedido en:',
        textUseCode: `(Usa el código de seguimiento y este correo: ${order.customer_email})`,
      };

  const unitPriceFor = (item: MrpapsOrderWithItems['items'][number]): number =>
    order.currency === 'USD' && item.unit_price_usd !== null
      ? Number(item.unit_price_usd)
      : Number(item.unit_price_mxn);

  const itemRows = order.items
    .map((item) => {
      const lineTotal = unitPriceFor(item) * item.quantity;
      return `<tr>
        <td style="padding:12px 0;border-bottom:1px solid #eee;">
          <strong>${escapeHtml(item.product_name)}</strong><br>
          <span style="color:#666;font-size:13px;">${escapeHtml(item.variant_label)} · SKU ${escapeHtml(item.sku)}</span>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;">${formatAmount(lineTotal, order.currency)}</td>
      </tr>`;
    })
    .join('');

  const itemLinesText = order.items
    .map(
      (item) =>
        `- ${item.product_name} (${item.variant_label}) x${item.quantity}: ${formatAmount(unitPriceFor(item) * item.quantity, order.currency)}`,
    )
    .join('\n');

  const shippingLine = order.shipping_label
    ? `${order.shipping_label}`
    : order.shipping_method;

  const subject = copy.subject;
  const subtotalAmount = order.currency === 'USD' ? order.subtotal_usd : order.subtotal_mxn;
  const shippingAmount = order.currency === 'USD' ? order.shipping_usd : order.shipping_mxn;
  const taxAmount = order.currency === 'USD' ? order.tax_usd : order.tax_mxn;
  const totalAmount = order.currency === 'USD' ? order.total_usd : order.total_mxn;

  const html = `<!DOCTYPE html>
<html lang="${copy.lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Georgia,'Times New Roman',serif;color:#18181b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);">
        <tr><td style="padding:32px 32px 16px;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.25em;text-transform:uppercase;color:#71717a;">Mr. Paps</p>
          <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;">${copy.heading}</h1>
          <p style="margin:0;font-size:16px;line-height:1.6;color:#52525b;">
            ${copy.greeting}
          </p>
        </td></tr>
        <tr><td style="padding:8px 32px 24px;">
          <div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:16px;padding:20px;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#71717a;">${copy.trackingCodeLabel}</p>
            <p style="margin:0;font-size:24px;font-weight:700;font-family:ui-monospace,Menlo,monospace;letter-spacing:0.06em;">${escapeHtml(trackingCode)}</p>
            <p style="margin:10px 0 0;font-size:13px;color:#71717a;">${copy.trackingCodeNote}</p>
          </div>
        </td></tr>
        <tr><td style="padding:0 32px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;color:#52525b;">
            <tr><td style="padding:6px 0;"><strong>${copy.orderNumberLabel}:</strong> ${escapeHtml(order.order_number)}</td></tr>
            <tr><td style="padding:6px 0;"><strong>${copy.shipToLabel}:</strong> ${escapeHtml(order.ship_address1)}${order.ship_address2 ? `, ${escapeHtml(order.ship_address2)}` : ''}, ${escapeHtml(order.ship_city)}, ${escapeHtml(order.ship_state_code)} ${escapeHtml(order.ship_zip)}</td></tr>
            <tr><td style="padding:6px 0;"><strong>${copy.shippingMethodLabel}:</strong> ${escapeHtml(shippingLine)}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 32px 8px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;">
            <thead>
              <tr>
                <th align="left" style="padding:0 0 8px;border-bottom:2px solid #18181b;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">${copy.productHeader}</th>
                <th align="center" style="padding:0 0 8px;border-bottom:2px solid #18181b;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">${copy.qtyHeader}</th>
                <th align="right" style="padding:0 0 8px;border-bottom:2px solid #18181b;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">${copy.totalHeader}</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
        </td></tr>
        <tr><td style="padding:16px 32px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;">
            <tr><td style="padding:4px 0;color:#52525b;">${copy.subtotalLabel}</td><td align="right">${formatAmount(subtotalAmount, order.currency)}</td></tr>
            <tr><td style="padding:4px 0;color:#52525b;">${copy.shippingLabel}</td><td align="right">${formatAmount(shippingAmount, order.currency)}</td></tr>
            <tr><td style="padding:4px 0;color:#52525b;">${copy.taxLabel}</td><td align="right">${formatAmount(taxAmount, order.currency)}</td></tr>
            <tr><td style="padding:10px 0 0;font-size:16px;font-weight:700;">${copy.totalPaidLabel}</td><td align="right" style="padding:10px 0 0;font-size:16px;font-weight:700;">${formatAmount(totalAmount, order.currency)}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 32px 32px;">
          <a href="${trackingUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:999px;font-size:14px;font-family:system-ui,sans-serif;">${copy.trackButtonLabel}</a>
          <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#71717a;">
            ${copy.alsoAccess(orderUrl)}
            ${copy.deliveryEstimate}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `${copy.textHeading}

${copy.textGreeting}

${copy.trackingCodeLabel}: ${trackingCode}
${copy.orderNumberLabel}: ${order.order_number}

${copy.textProductsLabel}
${itemLinesText}

${copy.subtotalLabel}: ${formatAmount(subtotalAmount, order.currency)}
${copy.shippingLabel} (${shippingLine}): ${formatAmount(shippingAmount, order.currency)}
${copy.taxLabel}: ${formatAmount(taxAmount, order.currency)}
${copy.totalPaidLabel}: ${formatAmount(totalAmount, order.currency)}

${copy.textTrackAt} ${trackingUrl}
${copy.textUseCode}

${copy.deliveryEstimate}

— Mr. Paps`;

  return { subject, html, text };
}

export async function sendOrderConfirmationEmail(rawPublicId: string): Promise<void> {
  if (!isMailConfigured()) {
    logger.warn({ publicOrderId: rawPublicId }, 'SMTP no configurado — correo de confirmación omitido');
    return;
  }

  const order = await ordersRepo.getOrderByPublicId(rawPublicId);
  if (!order) {
    logger.error({ publicOrderId: rawPublicId }, 'Pedido no encontrado para correo de confirmación');
    return;
  }

  if (order.confirmation_email_sent_at) {
    logger.info({ publicOrderId: order.public_id }, 'Correo de confirmación ya enviado');
    return;
  }

  const content = buildOrderConfirmationContent(order);

  try {
    await sendMail({
      to: order.customer_email,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
    try {
      await ordersRepo.markConfirmationEmailSent(order.public_id);
    } catch (markErr) {
      logger.error(
        { publicOrderId: order.public_id, err: markErr },
        'Correo enviado pero falló confirmation_email_sent_at (¿migración 016?)',
      );
    }
    logger.info(
      { publicOrderId: order.public_id, email: order.customer_email },
      'Correo de confirmación enviado',
    );
  } catch (error) {
    logger.error(
      { publicOrderId: order.public_id, email: order.customer_email, error },
      'Error al enviar correo de confirmación',
    );
    throw error;
  }
}
