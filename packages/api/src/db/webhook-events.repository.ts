import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import type { WebhookEventInsert, WebhookEventRow } from './types.js';

function mapDbError(operation: string, error: { message: string; code?: string }): never {
  logger.error({ operation, code: error.code, message: error.message }, 'Supabase webhook_events error');
  throw new Error(`webhook_events.${operation}: ${error.message}`);
}

export async function insertWebhookEvent(input: WebhookEventInsert): Promise<WebhookEventRow> {
  const { data, error } = await supabase
    .from('webhook_events')
    .insert(input)
    .select()
    .single();

  if (error || !data) {
    mapDbError('insert', error ?? { message: 'No row returned' });
  }

  return data;
}

export async function markWebhookProcessed(id: string): Promise<void> {
  const { error } = await supabase
    .from('webhook_events')
    .update({ processed_at: new Date().toISOString(), error: null })
    .eq('id', id);

  if (error) {
    mapDbError('markProcessed', error);
  }
}

export async function markWebhookError(id: string, errorMessage: string): Promise<void> {
  const { error } = await supabase
    .from('webhook_events')
    .update({ error: errorMessage })
    .eq('id', id);

  if (error) {
    mapDbError('markError', error);
  }
}

export async function listUnprocessedWebhookEvents(limit = 50): Promise<WebhookEventRow[]> {
  const { data, error } = await supabase
    .from('webhook_events')
    .select()
    .is('processed_at', null)
    .order('received_at', { ascending: true })
    .limit(limit);

  if (error) {
    mapDbError('listUnprocessed', error);
  }

  return data ?? [];
}
