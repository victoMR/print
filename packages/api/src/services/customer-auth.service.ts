import { SignJWT, jwtVerify } from 'jose';
import * as usersRepo from '../db/mrpaps-users.repository.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { AuthError, BadRequestError } from '../types/errors.js';
import type { MrpapsUserRow } from '../db/mrpaps.types.js';
const TOKEN_TTL = '30d';

export type CustomerTokenPayload = {
  sub: string;
  email: string;
  role: 'customer';
};

function getJwtSecret(): Uint8Array {
  const secret = process.env.CUSTOMER_JWT_SECRET ?? process.env.ADMIN_JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('CUSTOMER_JWT_SECRET requerido (≥32 chars)');
  return new TextEncoder().encode(`customer:${secret}`);
}

export async function registerCustomer(input: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}): Promise<{ token: string; user: ReturnType<typeof publicCustomer> }> {
  const email = input.email.trim().toLowerCase();
  if (input.password.length < 8) throw new BadRequestError('La contraseña debe tener al menos 8 caracteres');

  const existing = await usersRepo.findUserByEmail(email);
  if (existing?.password_hash) throw new BadRequestError('Ya existe una cuenta con ese correo. Inicia sesión.');

  const hash = await hashPassword(input.password);
  const user = await usersRepo.upsertCustomerWithPassword({ email, full_name: input.fullName, phone: input.phone ?? null, password_hash: hash });
  const token = await signCustomerToken(user);
  return { token, user: publicCustomer(user) };
}

export async function loginCustomer(email: string, password: string): Promise<{ token: string; user: ReturnType<typeof publicCustomer> }> {
  const user = await usersRepo.findUserByEmail(email.trim().toLowerCase());
  if (!user || user.role !== 'customer' || !user.password_hash) throw new AuthError('Correo o contraseña incorrectos');
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) throw new AuthError('Correo o contraseña incorrectos');
  const token = await signCustomerToken(user);
  return { token, user: publicCustomer(user) };
}

export async function signCustomerToken(user: Pick<MrpapsUserRow, 'id' | 'email' | 'role'>): Promise<string> {
  return new SignJWT({ email: user.email, role: 'customer' as const })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getJwtSecret());
}

export async function verifyCustomerToken(token: string): Promise<CustomerTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ['HS256'] });
    if (payload.role !== 'customer' || typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      throw new AuthError('Token inválido');
    }
    return { sub: payload.sub, email: payload.email, role: 'customer' };
  } catch {
    throw new AuthError('Sesión expirada o inválida');
  }
}

export function publicCustomer(user: MrpapsUserRow) {
  return { id: user.id, email: user.email, fullName: user.full_name, phone: user.phone, role: user.role };
}
