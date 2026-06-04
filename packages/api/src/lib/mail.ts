import nodemailer from 'nodemailer';
import type Transporter from 'nodemailer/lib/mailer/index.js';
import { logger } from './logger.js';

let transporter: Transporter | null = null;

function smtpPort(): number {
  const raw = process.env.SMTP_PORT ?? '587';
  const port = Number.parseInt(raw, 10);
  return Number.isFinite(port) ? port : 587;
}

function smtpSecure(): boolean {
  if (process.env.SMTP_SECURE === 'true') return true;
  if (process.env.SMTP_SECURE === 'false') return false;
  return smtpPort() === 465;
}

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain || !local) return '***';
  const visible = local.length <= 2 ? '*' : local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export type MailDiagnostics = {
  configured: boolean;
  host: string | null;
  port: number;
  secure: boolean;
  user: string | null;
  userMasked: string | null;
  from: string | null;
  fromName: string | null;
  storefrontUrl: string;
  missing: string[];
};

export function getMailDiagnostics(): MailDiagnostics {
  const host = process.env.SMTP_HOST?.trim() || null;
  const user = process.env.SMTP_USER?.trim() || null;
  const pass = process.env.SMTP_PASS?.trim();
  const from = (process.env.SMTP_FROM ?? process.env.SMTP_USER)?.trim() || null;
  const missing: string[] = [];
  if (!host) missing.push('SMTP_HOST');
  if (!user) missing.push('SMTP_USER');
  if (!pass) missing.push('SMTP_PASS');
  if (!from) missing.push('SMTP_FROM o SMTP_USER');

  return {
    configured: missing.length === 0,
    host,
    port: smtpPort(),
    secure: smtpSecure(),
    user,
    userMasked: user ? maskEmail(user) : null,
    from,
    fromName: process.env.SMTP_FROM_NAME?.trim() || 'Mr. Paps',
    storefrontUrl: storefrontUrl(),
    missing,
  };
}

export function resetMailTransporter(): void {
  transporter = null;
}

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP no configurado (SMTP_HOST, SMTP_USER, SMTP_PASS)');
  }

  transporter = nodemailer.createTransport({
    host,
    port: smtpPort(),
    secure: smtpSecure(),
    auth: { user, pass },
  });

  const diag = getMailDiagnostics();
  logger.info(
    { host: diag.host, port: diag.port, secure: diag.secure, user: diag.userMasked },
    'Cliente SMTP inicializado',
  );

  return transporter;
}

export async function verifySmtpConnection(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isMailConfigured()) {
    return { ok: false, error: 'SMTP no configurado' };
  }
  try {
    const transport = getTransporter();
    await transport.verify();
    logger.info('Verificación SMTP exitosa');
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: serializeMailError(err) }, 'Verificación SMTP falló');
    return { ok: false, error: message };
  }
}

function serializeMailError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    const extra = err as Error & { code?: string; response?: string; responseCode?: number };
    return {
      message: extra.message,
      code: extra.code,
      responseCode: extra.responseCode,
      response: extra.response,
    };
  }
  return { message: String(err) };
}

export type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendMail(input: SendMailInput): Promise<void> {
  const fromAddress = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  if (!fromAddress) {
    throw new Error('SMTP_FROM o SMTP_USER es requerido para enviar correo');
  }

  const fromName = process.env.SMTP_FROM_NAME ?? 'Mr. Paps';
  const transport = getTransporter();

  logger.info(
    { to: input.to, subject: input.subject, from: fromAddress, host: process.env.SMTP_HOST },
    'Enviando correo SMTP…',
  );

  try {
    const info = await transport.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    logger.info(
      {
        to: input.to,
        subject: input.subject,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      },
      'Correo enviado por SMTP',
    );
  } catch (err) {
    logger.error(
      { to: input.to, subject: input.subject, err: serializeMailError(err) },
      'Error al enviar correo SMTP',
    );
    throw err;
  }
}

export function storefrontUrl(): string {
  const url = process.env.STOREFRONT_URL ?? process.env.APP_URL ?? 'http://localhost:3000';
  return url.replace(/\/$/, '');
}
