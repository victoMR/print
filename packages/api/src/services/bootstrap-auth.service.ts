import * as usersRepo from '../db/mrpaps-users.repository.js';
import { hashPassword } from '../lib/password.js';
import { AuthError, BadRequestError } from '../types/errors.js';

export type BootstrapPasswordInput = {
  secret: string;
  email: string;
  password: string;
  fullName?: string;
  role: 'admin' | 'customer';
};

/**
 * Restablece contraseña (o crea usuario) con secreto de bootstrap.
 * Temporal: deshabilitado si ADMIN_BOOTSTRAP_SECRET no está definido.
 */
export async function bootstrapUserPassword(input: BootstrapPasswordInput): Promise<{
  email: string;
  role: 'admin' | 'customer';
  created: boolean;
}> {
  const expected = process.env.ADMIN_BOOTSTRAP_SECRET?.trim();
  if (!expected) {
    throw new BadRequestError(
      'Bootstrap deshabilitado. Define ADMIN_BOOTSTRAP_SECRET en packages/api/.env',
    );
  }

  if (input.secret !== expected) {
    throw new AuthError('Secret de bootstrap inválido');
  }

  if (input.password.length < 8) {
    throw new BadRequestError('La contraseña debe tener al menos 8 caracteres');
  }

  const email = input.email.trim().toLowerCase();
  const existing = await usersRepo.findUserByEmail(email);
  const password_hash = await hashPassword(input.password);

  if (input.role === 'admin') {
    await usersRepo.upsertAdminUser({
      email,
      full_name: input.fullName?.trim() || existing?.full_name || 'Administrador',
      password_hash,
    });
  } else {
    await usersRepo.upsertCustomerWithPassword({
      email,
      full_name: input.fullName?.trim() || existing?.full_name || email,
      phone: existing?.phone ?? null,
      password_hash,
    });
  }

  return { email, role: input.role, created: !existing };
}
