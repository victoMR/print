import bcrypt from 'bcryptjs';

/** Mismos rounds en registro, login, seed y bootstrap. */
export const PASSWORD_SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, PASSWORD_SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash.startsWith('$2')) {
    return false;
  }
  return bcrypt.compare(plain, hash);
}
