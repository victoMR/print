import { createHash, randomBytes } from 'node:crypto';

const TOKEN_BYTES = 32;
const TTL_HOURS = 48;

export function generateEmailVerificationToken(): { token: string; hash: string; expiresAt: Date } {
  const token = randomBytes(TOKEN_BYTES).toString('hex');
  const hash = hashEmailVerificationToken(token);
  const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000);
  return { token, hash, expiresAt };
}

export function hashEmailVerificationToken(token: string): string {
  return createHash('sha256').update(token.trim()).digest('hex');
}
