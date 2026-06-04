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

  return transporter;
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

  await transport.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  logger.info({ to: input.to, subject: input.subject }, 'Correo enviado');
}

export function storefrontUrl(): string {
  const url = process.env.STOREFRONT_URL ?? process.env.APP_URL ?? 'http://localhost:3000';
  return url.replace(/\/$/, '');
}
