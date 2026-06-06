import { SignJWT, jwtVerify } from 'jose';
import type { MrpapsUserRow } from '../db/mrpaps.types.js';
import * as usersRepo from '../db/mrpaps-users.repository.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { AuthError } from '../types/errors.js';

const TOKEN_TTL = '8h';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

type LoginAttemptState = { attempts: number; lockedUntil: number | null };
const loginAttempts = new Map<string, LoginAttemptState>();

function checkBruteForce(email: string): void {
  const state = loginAttempts.get(email);
  if (!state) return;
  if (state.lockedUntil && Date.now() < state.lockedUntil) {
    const remaining = Math.ceil((state.lockedUntil - Date.now()) / 60_000);
    throw new AuthError(`Cuenta bloqueada temporalmente. Intenta en ${remaining} min.`);
  }
  if (state.lockedUntil && Date.now() >= state.lockedUntil) {
    loginAttempts.delete(email);
  }
}

function recordFailedAttempt(email: string): void {
  const state = loginAttempts.get(email) ?? { attempts: 0, lockedUntil: null };
  state.attempts += 1;
  if (state.attempts >= MAX_ATTEMPTS) {
    state.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  loginAttempts.set(email, state);
}

function clearAttempts(email: string): void {
  loginAttempts.delete(email);
}

export { hashPassword, verifyPassword };

export type AdminTokenPayload = {
  sub: string;
  email: string;
  role: 'admin' | 'dev';
};

function getJwtSecret(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('ADMIN_JWT_SECRET debe tener al menos 32 caracteres');
  }
  return new TextEncoder().encode(secret);
}

export async function loginAdmin(email: string, password: string) {
  checkBruteForce(email);

  const user = await usersRepo.findUserByEmailForAuth(email);
  if (!user || (user.role !== 'admin' && user.role !== 'dev') || !user.password_hash) {
    recordFailedAttempt(email);
    throw new AuthError('Correo o contraseña incorrectos');
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    recordFailedAttempt(email);
    throw new AuthError('Correo o contraseña incorrectos');
  }

  clearAttempts(email);
  const token = await signAdminToken(user);
  return {
    token,
    user: publicAdminUser(user),
  };
}

export async function signAdminToken(user: Pick<MrpapsUserRow, 'id' | 'email' | 'role'>): Promise<string> {
  if (user.role !== 'admin' && user.role !== 'dev') {
    throw new AuthError('No autorizado');
  }

  return new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getJwtSecret());
}

function customerJwtSecret(): Uint8Array | null {
  const secret = process.env.CUSTOMER_JWT_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export async function verifyAdminToken(token: string): Promise<AdminTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ['HS256'],
    });

    if (
      (payload.role !== 'admin' && payload.role !== 'dev') ||
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string'
    ) {
      throw new AuthError('Token inválido');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role as 'admin' | 'dev',
    };
  } catch (err) {
    if (err instanceof AuthError) throw err;

    const customerSecret = customerJwtSecret();
    if (customerSecret) {
      try {
        const { payload } = await jwtVerify(token, customerSecret, { algorithms: ['HS256'] });
        if (payload.role === 'customer') {
          throw new AuthError(
            'Este token es de cuenta cliente (tienda). Para /admin/* inicia sesión en el panel admin: POST /api/v1/admin/auth/login',
          );
        }
      } catch (inner) {
        if (inner instanceof AuthError) throw inner;
      }
    }

    throw new AuthError('Sesión expirada o inválida');
  }
}

export function publicAdminUser(user: MrpapsUserRow) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
  };
}
