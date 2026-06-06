import { queryOne } from '../lib/db-helper.js';

/** Devuelve true si este proceso debe procesar el evento (primera vez). */
export async function claimStripeWebhookEvent(eventId: string, eventType: string): Promise<boolean> {
  const row = await queryOne<{ event_id: string }>(
    `INSERT INTO stripe_webhook_events (event_id, event_type)
     VALUES ($1, $2)
     ON CONFLICT (event_id) DO NOTHING
     RETURNING event_id`,
    [eventId, eventType],
  );
  return row !== null;
}
