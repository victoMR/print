import type { PoolClient, QueryResultRow } from 'pg';
import { pool } from './db.js';

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function queryRequired<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T> {
  const row = await queryOne<T>(text, params);
  if (!row) throw new Error('Expected row not returned from database');
  return row;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export function buildUpdateSet(
  patch: Record<string, unknown>,
  startIndex = 2,
): { clause: string; values: unknown[] } {
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    throw new Error('Empty update patch');
  }
  const values: unknown[] = [];
  const clause = entries
    .map(([key], index) => {
      values.push(entries[index]![1]);
      return `${key} = $${startIndex + index}`;
    })
    .join(', ');
  return { clause, values };
}
