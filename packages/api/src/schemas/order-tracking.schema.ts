import { z } from 'zod';

export const trackOrderBodySchema = z.object({
  trackingCode: z.string().min(1).max(64),
  email: z.string().email(),
});

export type TrackOrderBody = z.infer<typeof trackOrderBodySchema>;

export const guestOrderQuerySchema = z.object({
  email: z.string().email(),
});
