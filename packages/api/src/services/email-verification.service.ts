import {
  generateEmailVerificationToken,
  hashEmailVerificationToken,
} from '../lib/email-verification-token.js';
import { isMailConfigured, sendMail, storefrontUrl } from '../lib/mail.js';
import { logger } from '../lib/logger.js';
import * as usersRepo from '../db/mrpaps-users.repository.js';
import { BadRequestError, NotFoundError } from '../types/errors.js';

export const LEGAL_VERSION = '1.0';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export async function sendEmailVerification(userId: string, email: string, fullName: string): Promise<void> {
  const { token, hash, expiresAt } = generateEmailVerificationToken();
  await usersRepo.setEmailVerificationToken(userId, hash, expiresAt.toISOString());

  if (!isMailConfigured()) {
    logger.warn({ userId, email }, 'SMTP no configurado: verificación de correo no enviada');
    return;
  }

  const verifyUrl = `${storefrontUrl()}/verificar-email?token=${encodeURIComponent(token)}`;
  const name = escapeHtml(fullName.trim() || 'Cliente');

  await sendMail({
    to: email,
    subject: 'Confirma tu correo — Mr. Paps',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <h1 style="font-size:22px;margin:0 0 16px;">Hola, ${name}</h1>
        <p style="color:#444;line-height:1.6;">Gracias por crear tu cuenta en Mr. Paps. Confirma tu correo para activar tu cuenta y poder iniciar sesión.</p>
        <p style="margin:28px 0;">
          <a href="${verifyUrl}" style="display:inline-block;background:#111;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600;">
            Verificar mi correo
          </a>
        </p>
        <p style="color:#666;font-size:13px;line-height:1.5;">Si el botón no funciona, copia este enlace en tu navegador:<br><a href="${verifyUrl}">${escapeHtml(verifyUrl)}</a></p>
        <p style="color:#999;font-size:12px;margin-top:32px;">Este enlace expira en 48 horas. Si no creaste esta cuenta, ignora este mensaje.</p>
      </div>
    `,
    text: `Hola, ${fullName}\n\nConfirma tu correo en Mr. Paps:\n${verifyUrl}\n\nEl enlace expira en 48 horas.`,
  });
}

export async function verifyEmailByToken(rawToken: string): Promise<{ email: string }> {
  const token = rawToken?.trim();
  if (!token || token.length < 16) {
    throw new BadRequestError('Enlace de verificación no válido');
  }

  const hash = hashEmailVerificationToken(token);
  const user = await usersRepo.findUserByEmailVerificationHash(hash);
  if (!user) {
    throw new NotFoundError('Enlace de verificación inválido o ya utilizado');
  }

  if (user.email_verified_at) {
    return { email: user.email };
  }

  if (user.email_verification_expires_at && new Date(user.email_verification_expires_at) < new Date()) {
    throw new BadRequestError('El enlace de verificación expiró. Solicita uno nuevo.');
  }

  await usersRepo.markEmailVerified(user.id);
  logger.info({ userId: user.id }, 'Correo de cuenta verificado');
  return { email: user.email };
}

export async function resendEmailVerification(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const user = await usersRepo.findUserByEmail(normalized);
  if (!user || user.role !== 'customer') {
    // No revelar si el correo existe
    return;
  }
  if (user.email_verified_at) {
    throw new BadRequestError('Este correo ya está verificado. Puedes iniciar sesión.');
  }
  await sendEmailVerification(user.id, user.email, user.full_name);
}
