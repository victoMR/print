import pg from 'pg';
import { logger } from './logger.js';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

/** Pool PostgreSQL — conexión directa (localhost en VPS). */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'PostgreSQL pool error');
});

export async function validateDatabase(): Promise<void> {
  await pool.query('SELECT 1');
  const { rows } = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'mrpaps_orders'
     ) AS exists`,
  );
  if (!rows[0]?.exists) {
    throw new Error(
      'Tabla mrpaps_orders no encontrada. Ejecuta las migraciones: pnpm --filter @print/api migrate',
    );
  }
  logger.info('PostgreSQL connection OK');
}
