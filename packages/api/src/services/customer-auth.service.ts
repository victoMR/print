import { SignJWT, jwtVerify } from 'jose';
import * as usersRepo from '../db/mrpaps-users.repository.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { AuthError, BadRequestError } from '../types/errors.js';
import type { MrpapsUserRow } from '../db/mrpaps.types.js';
import { sendEmailVerification, LEGAL_VERSION } from './email-verification.service.js';

const TOKEN_TTL_LONG = '30d';
const TOKEN_TTL_SHORT = '1d';

export type CustomerTokenPayload = {
  sub: string;
  email: string;
  role: 'customer';
  tv: number;
  rm?: boolean;
};

function getJwtSecret(): Uint8Array {
  const secret = process.env.CUSTOMER_JWT_SECRET;

  // In production, require an explicit separate secret so rotating ADMIN_JWT_SECRET
  // never invalidates customer sessions (and vice versa).
  if (process.env.NODE_ENV === 'production' && !secret) {
    throw new Error(
      'CUSTOMER_JWT_SECRET es obligatorio en producción. ' +
      'Define una clave independiente de al menos 32 caracteres en .env.',
    );
  }

  // Development/staging fallback: derive a distinct secret from the admin key.
  const effective = secret ?? process.env.ADMIN_JWT_SECRET;
  if (!effective || effective.length < 32) {
    throw new Error('CUSTOMER_JWT_SECRET requerido (≥32 chars)');
  }

  return new TextEncoder().encode(`customer:${effective}`);
}

export async function registerCustomer(input: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  acceptedTerms: true;
  acceptedPrivacy: true;
}): Promise<{ requiresEmailVerification: true; email: string }> {
  const email = input.email.trim().toLowerCase();
  if (input.password.length < 8) throw new BadRequestError('La contraseña debe tener al menos 8 caracteres');

  const existing = await usersRepo.findUserByEmail(email);
  if (existing?.password_hash) {
    throw new BadRequestError('Ya existe una cuenta con ese correo. Inicia sesión.');
  }

  const hash = await hashPassword(input.password);
  let user: MrpapsUserRow;
  try {
    user = await usersRepo.createCustomerForRegistration({
      email,
      full_name: input.fullName,
      phone: input.phone ?? null,
      password_hash: hash,
      legal_version: LEGAL_VERSION,
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'EMAIL_ALREADY_REGISTERED') {
      throw new BadRequestError('Ya existe una cuenta con ese correo. Inicia sesión.');
    }
    throw err;
  }

  await sendEmailVerification(user.id, user.email, user.full_name);

  return { requiresEmailVerification: true, email: user.email };
}

export async function loginCustomer(
  email: string,
  password: string,
  rememberMe = true,
): Promise<{ token: string; user: ReturnType<typeof publicCustomer>; rememberMe: boolean }> {
  const user = await usersRepo.findUserByEmail(email.trim().toLowerCase());
  if (!user || user.role !== 'customer' || !user.password_hash) throw new AuthError('Correo o contraseña incorrectos');
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) throw new AuthError('Correo o contraseña incorrectos');

  if (!user.email_verified_at) {
    throw new AuthError(
      'Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada o solicita un nuevo enlace.',
    );
  }

  const token = await signCustomerToken(user, { rememberMe });
  return { token, user: publicCustomer(user), rememberMe };
}

export async function signCustomerToken(
  user: Pick<MrpapsUserRow, 'id' | 'email' | 'role' | 'token_version'>,
  options?: { rememberMe?: boolean },
): Promise<string> {
  const rememberMe = options?.rememberMe !== false;
  const tv = user.token_version ?? 0;
  return new SignJWT({ email: user.email, role: 'customer' as const, tv, rm: rememberMe })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(rememberMe ? TOKEN_TTL_LONG : TOKEN_TTL_SHORT)
    .sign(getJwtSecret());
}

/** Renueva JWT y cookie sin invalidar token_version (sesión deslizante). */
export async function refreshCustomerSession(
  token: string,
): Promise<{ token: string; user: ReturnType<typeof publicCustomer>; rememberMe: boolean } | null> {
  try {
    const payload = await verifyCustomerToken(token);
    const user = await usersRepo.findUserById(payload.sub);
    if (!user || user.role !== 'customer' || !user.email_verified_at) return null;
    if ((user.token_version ?? 0) !== payload.tv) return null;

    const rememberMe = payload.rm !== false;
    const newToken = await signCustomerToken(user, { rememberMe });
    return { token: newToken, user: publicCustomer(user), rememberMe };
  } catch {
    return null;
  }
}

export async function verifyCustomerToken(token: string): Promise<CustomerTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ['HS256'] });
    if (payload.role !== 'customer' || typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      throw new AuthError('Token inválido');
    }
    const tv = typeof payload.tv === 'number' ? payload.tv : 0;
    const rm = payload.rm === false ? false : true;
    return { sub: payload.sub, email: payload.email, role: 'customer', tv, rm };
  } catch {
    throw new AuthError('Sesión expirada o inválida');
  }
}

export async function resolveCustomerSession(
  token: string,
  options?: { requireVerifiedEmail?: boolean },
): Promise<{ id: string; email: string; role: 'customer' } | null> {
  try {
    const payload = await verifyCustomerToken(token);
    const user = await usersRepo.findUserById(payload.sub);
    if (!user || user.role !== 'customer') return null;
    if (options?.requireVerifiedEmail !== false && !user.email_verified_at) return null;
    if ((user.token_version ?? 0) !== payload.tv) return null;
    return { id: payload.sub, email: payload.email, role: 'customer' };
  } catch {
    return null;
  }
}

export function publicCustomer(user: MrpapsUserRow) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    phone: user.phone,
    role: user.role,
    emailVerified: Boolean(user.email_verified_at),
  };
}
