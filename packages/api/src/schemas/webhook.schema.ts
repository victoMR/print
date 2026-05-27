import { z } from 'zod';

export const WEBHOOK_EVENT_TYPES = [
  'order_created',
  'order_updated',
  'order_failed',
  'order_canceled',
  'order_put_hold',
  'order_remove_hold',
  'order_refunded',
  'package_shipped',
  'package_returned',
  'stock_updated',
] as const;

export const WebhookPayload = z.object({
  type: z.enum(WEBHOOK_EVENT_TYPES),
  created: z.number().optional(),
  retries: z.number().optional(),
  store: z.number().optional(),
  data: z.record(z.unknown()),
});

export type WebhookPayloadType = z.infer<typeof WebhookPayload>;

export const WebhookSetupInput = z.object({
  url: z.string().url(),
  types: z.array(z.enum(WEBHOOK_EVENT_TYPES)).min(1),
});
