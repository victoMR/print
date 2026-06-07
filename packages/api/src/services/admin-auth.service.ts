import { SignJWT, jwtVerify } from 'jose';
import type { MrpapsUserRow } from '../db/mrpaps.types.js';
import * as usersRepo from '../db/mrpaps-users.repository.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { getRedisConnection } from '../lib/queue.js';
import { AuthError } from '../types/errors.js';
import {
  consumeAdminRefreshToken,
  createAdminRefreshToken,
  revokeAdminRefreshToken,
  revokeAllAdminRefreshTokens,
} from './admin-refresh-token.service.js';

/** Access token corto; se renueva con refresh token opaco. */
const ACCESS_TOKEN_TTL = '15m';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECS = 15 * 60; // 15 minutes

// ── Brute-force lockout ────────────────────────────────────────────────────
// Redis-backed when Redis is available (survives multi-process PM2 deployments).
// Falls back to in-memory when Redis is disabled.

type LoginAttemptState = { attempts: number; lockedUntil: number | null };
const memoryAttempts = new Map<string, LoginAttemptState>();

async function checkBruteForce(email: string): Promise<void> {
  const redis = getRedisConnection();
  if (redis) {
    const key = `admin:lockout:${email}`;
    const raw = await redis.get(key);
    if (raw) {
      const attempts = parseInt(raw, 10);
      if (attempts >= MAX_ATTEMPTS) {
        const ttl = await redis.ttl(key);
        const remaining = Math.ceil(ttl / 60);
        throw new AuthError(`Cuenta bloqueada temporalmente. Intenta en ${remaining} min.`);
      }
    }
    return;
  }
  // In-memory fallback
  const state = memoryAttempts.get(email);
  if (!state) return;
  if (state.lockedUntil && Date.now() < state.lockedUntil) {
    const remaining = Math.ceil((state.lockedUntil - Date.now()) / 60_000);
    throw new AuthError(`Cuenta bloqueada temporalmente. Intenta en ${remaining} min.`);
  }
  if (state.lockedUntil && Date.now() >= state.lockedUntil) {
    memoryAttempts.delete(email);
  }
}

async function recordFailedAttempt(email: string): Promise<void> {
  const redis = getRedisConnection();
  if (redis) {
    const key = `admin:lockout:${email}`;
    const attempts = await redis.incr(key);
    if (attempts === 1) await redis.expire(key, LOCKOUT_SECS);
    return;
  }
  // In-memory fallback
  const state = memoryAttempts.get(email) ?? { attempts: 0, lockedUntil: null };
  state.attempts += 1;
  if (state.attempts >= MAX_ATTEMPTS) {
    state.lockedUntil = Date.now() + LOCKOUT_SECS * 1000;
  }
  memoryAttempts.set(email, state);
}

async function clearAttempts(email: string): Promise<void> {
  const redis = getRedisConnection();
  if (redis) {
    await redis.del(`admin:lockout:${email}`);
    return;
  }
  memoryAttempts.delete(email);
}

export { hashPassword, verifyPassword };

export type AdminTokenPayload = {
  sub: string;
  email: string;
  role: 'admin' | 'dev';
  tv: number;
};

function getJwtSecret(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('ADMIN_JWT_SECRET debe tener al menos 32 caracteres');
  }
  return new TextEncoder().encode(secret);
}

export async function loginAdmin(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  await checkBruteForce(normalizedEmail);

  const user = await usersRepo.findUserByEmailForAuth(normalizedEmail);
  if (!user || (user.role !== 'admin' && user.role !== 'dev') || !user.password_hash) {
    await recordFailedAttempt(normalizedEmail);
    throw new AuthError('Correo o contraseña incorrectos');
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    await recordFailedAttempt(normalizedEmail);
    throw new AuthError('Correo o contraseña incorrectos');
  }

  await clearAttempts(normalizedEmail);
  const accessToken = await signAdminToken(user);
  const refreshToken = await createAdminRefreshToken(user.id);
  return {
    accessToken,
    refreshToken,
    user: publicAdminUser(user),
  };
}

export async function signAdminToken(
  user: Pick<MrpapsUserRow, 'id' | 'email' | 'role' | 'token_version'>,
): Promise<string> {
  if (user.role !== 'admin' && user.role !== 'dev') {
    throw new AuthError('No autorizado');
  }

  const tv = user.token_version ?? 0;
  return new SignJWT({ email: user.email, role: user.role, tv })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
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

    const tv = typeof payload.tv === 'number' ? payload.tv : 0;

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role as 'admin' | 'dev',
      tv,
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

/** Valida access token contra BD (revocación vía token_version). */
export async function resolveAdminSession(
  token: string,
): Promise<{ id: string; email: string; role: 'admin' | 'dev' } | null> {
  try {
    const payload = await verifyAdminToken(token);
    const user = await usersRepo.findUserById(payload.sub);
    if (!user || (user.role !== 'admin' && user.role !== 'dev')) return null;
    if ((user.token_version ?? 0) !== payload.tv) return null;
    return { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return null;
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

/**
 * Renueva sesión admin usando refresh token opaco (rotación one-time).
 * Devuelve nuevo access JWT + nuevo refresh token.
 */
export async function refreshAdminSession(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  user: ReturnType<typeof publicAdminUser>;
} | null> {
  const userId = await consumeAdminRefreshToken(refreshToken);
  if (!userId) return null;

  const user = await usersRepo.findUserById(userId);
  if (!user || (user.role !== 'admin' && user.role !== 'dev')) return null;

  const accessToken = await signAdminToken(user);
  const newRefreshToken = await createAdminRefreshToken(user.id);
  return { accessToken, refreshToken: newRefreshToken, user: publicAdminUser(user) };
}

/** Logout server-side: invalida JWTs y refresh tokens. */
export async function revokeAdminSession(userId: string, refreshToken?: string | null): Promise<void> {
  await usersRepo.incrementAdminTokenVersion(userId);
  if (refreshToken) {
    await revokeAdminRefreshToken(refreshToken);
  }
  await revokeAllAdminRefreshTokens(userId);
}

/** Resuelve userId para logout (access o refresh cookie). */
export async function resolveAdminLogoutUserId(
  accessToken: string | null,
  refreshToken: string | null,
): Promise<string | null> {
  if (accessToken) {
    const session = await resolveAdminSession(accessToken);
    if (session) return session.id;
  }
  if (refreshToken) {
    const { findAdminRefreshTokenUserId } = await import('./admin-refresh-token.service.js');
    return findAdminRefreshTokenUserId(refreshToken);
  }
  return null;
}
