import { z } from 'zod';

export const analyticsPeriodSchema = z.enum(['week', 'month', 'quarter', 'year', 'custom']);

export const adminAnalyticsQuerySchema = z
  .object({
    period: analyticsPeriodSchema.default('month'),
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.period === 'custom') {
      if (!data.from) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'from requerido', path: ['from'] });
      }
      if (!data.to) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'to requerido', path: ['to'] });
      }
      if (data.from && data.to && data.from > data.to) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'from debe ser anterior a to', path: ['from'] });
      }
    }
  });

export const adminAnalyticsExportSchema = adminAnalyticsQuerySchema.and(
  z.object({
    format: z.enum(['csv', 'pdf']),
  }),
);

export type AnalyticsPeriod = z.infer<typeof analyticsPeriodSchema>;
export type AdminAnalyticsQuery = z.infer<typeof adminAnalyticsQuerySchema>;
