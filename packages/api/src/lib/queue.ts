import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from './logger.js';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

export interface WebhookJobData {
  type: string;
  data: Record<string, unknown>;
  receivedAt: number;
}

let redisConnection: Redis | null = null;
let webhookQueue: Queue<WebhookJobData> | null = null;
let redisReady = false;

export function isRedisReady(): boolean {
  return redisReady;
}

export function getRedisConnection(): Redis | null {
  return redisConnection;
}

export function getWebhookQueue(): Queue<WebhookJobData> | null {
  return webhookQueue;
}

/** Conecta Redis + cola BullMQ. En dev, falla en silencio y permite arrancar sin Redis. */
export async function connectRedis(): Promise<boolean> {
  if (process.env.REDIS_ENABLED === 'false') {
    logger.warn('Redis deshabilitado (REDIS_ENABLED=false); webhooks en proceso');
    return false;
  }

  if (redisReady) {
    return true;
  }

  const redis = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    connectTimeout: 3000,
    retryStrategy: () => null,
  });

  try {
    await redis.connect();
    await redis.ping();

    redis.on('error', (err: Error) => {
      logger.error({ err }, 'Redis connection error');
    });

    redisConnection = redis;
    webhookQueue = new Queue<WebhookJobData>('printful-webhook', {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });

    redisReady = true;
    logger.info('Redis conectado (cache + BullMQ)');
    return true;
  } catch (err) {
    redis.disconnect();

    if (process.env.NODE_ENV === 'development') {
      logger.warn(
        { err },
        'Redis no disponible en dev; API arranca sin cola (webhooks inline). Levanta Redis con: docker compose up -d redis',
      );
      return false;
    }

    throw new Error(
      `Redis connection failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
