import { query, queryRequired } from '../lib/db-helper.js';
import { logger } from '../lib/logger.js';
import type { WebhookEventInsert, WebhookEventRow } from './types.js';

function mapDbError(operation: string, error: Error): never {
  logger.error({ operation, message: error.message }, 'PostgreSQL webhook_events error');
  throw new Error(`webhook_events.${operation}: ${error.message}`);
}

export async function insertWebhookEvent(input: WebhookEventInsert): Promise<WebhookEventRow> {
  try {
    return await queryRequired<WebhookEventRow>(
      `INSERT INTO webhook_events (event_type, printful_order_id, payload)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [input.event_type, input.printful_order_id ?? null, JSON.stringify(input.payload)],
    );
  } catch (err) {
    mapDbError('insert', err instanceof Error ? err : new Error(String(err)));
  }
}

export async function markWebhookProcessed(id: string): Promise<void> {
  await query(
    `UPDATE webhook_events SET processed_at = NOW(), error = NULL WHERE id = $1`,
    [id],
  );
}

export async function markWebhookError(id: string, errorMessage: string): Promise<void> {
  await query(`UPDATE webhook_events SET error = $2 WHERE id = $1`, [id, errorMessage]);
}

export async function listUnprocessedWebhookEvents(limit = 50): Promise<WebhookEventRow[]> {
  return query<WebhookEventRow>(
    `SELECT * FROM webhook_events
     WHERE processed_at IS NULL
     ORDER BY received_at ASC
     LIMIT $1`,
    [limit],
  );
}
