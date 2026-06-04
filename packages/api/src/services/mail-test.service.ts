import { z } from 'zod';
import { getMailDiagnostics, sendMail, verifySmtpConnection } from '../lib/mail.js';
import { logger } from '../lib/logger.js';
import * as ordersRepo from '../db/mrpaps-orders.repository.js';
import {
  buildOrderConfirmationContent,
  sendOrderConfirmationEmail,
} from './order-confirmation-email.service.js';
import { NotFoundError } from '../types/errors.js';

export const adminMailTestSchema = z.object({
  to: z.string().email().optional(),
  mode: z.enum(['simple', 'order']).default('simple'),
  publicOrderId: z.string().min(1).max(64).optional(),
  verifyOnly: z.boolean().optional(),
  forceOrderEmail: z.boolean().optional(),
});

export type AdminMailTestInput = z.infer<typeof adminMailTestSchema>;

export async function getMailStatus() {
  const diagnostics = getMailDiagnostics();
  const verify = diagnostics.configured ? await verifySmtpConnection() : { ok: false as const, error: 'SMTP no configurado' };

  return {
    diagnostics,
    smtpVerify: verify,
  };
}

export async function runMailTest(input: AdminMailTestInput) {
  const diagnostics = getMailDiagnostics();
  logger.info({ input: { ...input, to: input.to ?? '(default)' }, diagnostics }, 'Admin: prueba de correo iniciada');

  if (!diagnostics.configured) {
    logger.warn({ missing: diagnostics.missing }, 'Admin: SMTP incompleto');
    return {
      ok: false,
      step: 'config' as const,
      diagnostics,
      error: `Faltan variables: ${diagnostics.missing.join(', ')}`,
    };
  }

  const verify = await verifySmtpConnection();
  if (!verify.ok) {
    return {
      ok: false,
      step: 'verify' as const,
      diagnostics,
      smtpVerify: verify,
      error: verify.error,
    };
  }

  if (input.verifyOnly) {
    logger.info('Admin: prueba SMTP solo verificación — OK');
    return {
      ok: true,
      step: 'verify' as const,
      diagnostics,
      smtpVerify: verify,
      message: 'Conexión SMTP verificada. No se envió correo (verifyOnly=true).',
    };
  }

  if (input.mode === 'order') {
    const orderId = input.publicOrderId?.trim();
    if (!orderId) {
      return {
        ok: false,
        step: 'order' as const,
        diagnostics,
        error: 'Indica publicOrderId para mode=order',
      };
    }

    if (input.forceOrderEmail) {
      const order = await ordersRepo.getOrderByPublicId(orderId);
      if (!order) throw new NotFoundError('Pedido no encontrado');

      const content = buildOrderConfirmationContent(order);
      const to = input.to ?? order.customer_email;

      await sendMail({
        to,
        subject: `[PRUEBA] ${content.subject}`,
        html: content.html,
        text: content.text,
      });

      logger.info({ publicOrderId: order.public_id, to }, 'Admin: correo de pedido (forzado) enviado');
      return {
        ok: true,
        step: 'send' as const,
        diagnostics,
        smtpVerify: verify,
        mode: 'order' as const,
        to,
        publicOrderId: order.public_id,
        message: 'Plantilla de confirmación enviada (no actualiza confirmation_email_sent_at).',
      };
    }

    await sendOrderConfirmationEmail(orderId);
    const order = await ordersRepo.getOrderByPublicId(orderId);

    return {
      ok: true,
      step: 'send' as const,
      diagnostics,
      smtpVerify: verify,
      mode: 'order' as const,
      to: order?.customer_email ?? input.to,
      publicOrderId: orderId,
      confirmationEmailSentAt: order?.confirmation_email_sent_at ?? null,
      message: order?.confirmation_email_sent_at
        ? 'Flujo de confirmación ejecutado (ya estaba marcado como enviado o se envió ahora).'
        : 'Flujo de confirmación ejecutado. Revisa logs si no llegó.',
    };
  }

  const to = input.to ?? diagnostics.from ?? diagnostics.user;
  if (!to) {
    return {
      ok: false,
      step: 'send' as const,
      diagnostics,
      error: 'Indica "to" en el body o configura SMTP_FROM / SMTP_USER',
    };
  }

  const sentAt = new Date().toISOString();
  await sendMail({
    to,
    subject: 'Prueba SMTP — Mr. Paps',
    text: `Correo de prueba enviado a las ${sentAt} desde el API de Mr. Paps.\n\nSi recibes esto, SMTP está funcionando.`,
    html: `<p>Correo de prueba enviado a las <strong>${sentAt}</strong> desde el API de Mr. Paps.</p><p>Si ves este mensaje, SMTP está funcionando.</p>`,
  });

  logger.info({ to }, 'Admin: correo simple de prueba enviado');

  return {
    ok: true,
    step: 'send' as const,
    diagnostics,
    smtpVerify: verify,
    mode: 'simple' as const,
    to,
    message: `Correo de prueba enviado a ${to}`,
  };
}
