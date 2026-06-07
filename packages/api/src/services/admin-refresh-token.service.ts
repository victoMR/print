import { createHash, randomBytes } from 'crypto';
import { getRedisConnection } from '../lib/queue.js';

const REFRESH_TTL_SECS = 7 * 24 * 60 * 60; // 7 days

type MemoryEntry = { userId: string; expiresAt: number };
const memoryStore = new Map<string, MemoryEntry>();

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function refreshKey(tokenHash: string): string {
  return `admin:refresh:${tokenHash}`;
}

function userRefreshSetKey(userId: string): string {
  return `admin:refresh:user:${userId}`;
}

/** Emite un refresh token opaco (rotación en cada uso). */
export async function createAdminRefreshToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const hashed = hashToken(token);
  const redis = getRedisConnection();

  if (redis) {
    await redis.setex(refreshKey(hashed), REFRESH_TTL_SECS, userId);
    await redis.sadd(userRefreshSetKey(userId), hashed);
    await redis.expire(userRefreshSetKey(userId), REFRESH_TTL_SECS);
    return token;
  }

  memoryStore.set(hashed, { userId, expiresAt: Date.now() + REFRESH_TTL_SECS * 1000 });
  return token;
}

/** Valida refresh token, lo consume (one-time) y devuelve userId. */
export async function consumeAdminRefreshToken(token: string): Promise<string | null> {
  const hashed = hashToken(token);
  const redis = getRedisConnection();

  if (redis) {
    const userId = await redis.get(refreshKey(hashed));
    if (!userId) return null;
    await redis.del(refreshKey(hashed));
    await redis.srem(userRefreshSetKey(userId), hashed);
    return userId;
  }

  const entry = memoryStore.get(hashed);
  if (!entry || Date.now() > entry.expiresAt) {
    memoryStore.delete(hashed);
    return null;
  }
  memoryStore.delete(hashed);
  return entry.userId;
}

/** Lee userId del refresh token sin consumirlo (p. ej. logout). */
export async function findAdminRefreshTokenUserId(token: string): Promise<string | null> {
  const hashed = hashToken(token);
  const redis = getRedisConnection();

  if (redis) {
    return redis.get(refreshKey(hashed));
  }

  const entry = memoryStore.get(hashed);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.userId;
}

/** Revoca el refresh token actual (logout). */
export async function revokeAdminRefreshToken(token: string): Promise<void> {
  const hashed = hashToken(token);
  const redis = getRedisConnection();

  if (redis) {
    const userId = await redis.get(refreshKey(hashed));
    await redis.del(refreshKey(hashed));
    if (userId) await redis.srem(userRefreshSetKey(userId), hashed);
    return;
  }

  memoryStore.delete(hashed);
}

/** Revoca todas las sesiones refresh de un admin (logout global). */
export async function revokeAllAdminRefreshTokens(userId: string): Promise<void> {
  const redis = getRedisConnection();

  if (redis) {
    const hashes = await redis.smembers(userRefreshSetKey(userId));
    if (hashes.length > 0) {
      const pipe = redis.pipeline();
      for (const h of hashes) pipe.del(refreshKey(h));
      pipe.del(userRefreshSetKey(userId));
      await pipe.exec();
    }
    return;
  }

  for (const [key, entry] of memoryStore) {
    if (entry.userId === userId) memoryStore.delete(key);
  }
}
