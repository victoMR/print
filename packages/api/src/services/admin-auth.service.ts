import { SignJWT, jwtVerify } from 'jose';
import type { MrpapsUserRow } from '../db/mrpaps.types.js';
import * as usersRepo from '../db/mrpaps-users.repository.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { AuthError } from '../types/errors.js';

const TOKEN_TTL = '8h';

export { hashPassword, verifyPassword };

export type AdminTokenPayload = {
  sub: string;
  email: string;
  role: 'admin';
};

function getJwtSecret(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('ADMIN_JWT_SECRET debe tener al menos 32 caracteres');
  }
  return new TextEncoder().encode(secret);
}

export async function loginAdmin(email: string, password: string) {
  const user = await usersRepo.findUserByEmailForAuth(email);
  if (!user || user.role !== 'admin' || !user.password_hash) {
    throw new AuthError('Correo o contraseña incorrectos');
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    throw new AuthError('Correo o contraseña incorrectos');
  }

  const token = await signAdminToken(user);
  return {
    token,
    user: publicAdminUser(user),
  };
}

export async function signAdminToken(user: Pick<MrpapsUserRow, 'id' | 'email' | 'role'>): Promise<string> {
  if (user.role !== 'admin') {
    throw new AuthError('No autorizado');
  }

  return new SignJWT({ email: user.email, role: 'admin' as const })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getJwtSecret());
}

export async function verifyAdminToken(token: string): Promise<AdminTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ['HS256'],
    });

    if (payload.role !== 'admin' || typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      throw new AuthError('Token inválido');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: 'admin',
    };
  } catch {
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
