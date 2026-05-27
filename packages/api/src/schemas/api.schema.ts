import { z } from 'zod';
import { mxStateCodeSchema } from './order.schema.js';

export const addressSchema = z.object({
  address1: z.string().min(1),
  address2: z.string().optional(),
  city: z.string().min(1),
  stateCode: mxStateCodeSchema,
  countryCode: z.literal('MX'),
  zip: z.string().regex(/^\d{5}$/),
});

export const checkoutItemSchema = z.object({
  syncVariantId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  retailPriceMxn: z.string().regex(/^\d+\.\d{2}$/).optional(),
});

export const shippingRatesBodySchema = z.object({
  items: z.array(z.object({
    syncVariantId: z.number().int().positive(),
    quantity: z.number().int().positive(),
  })).min(1),
  address: addressSchema,
  recipient: z.object({
    name: z.string().min(1),
    phone: z.string().min(10),
    email: z.string().email(),
  }).optional(),
});

export const estimateBodySchema = z.object({
  items: z.array(z.object({
    syncVariantId: z.number().int().positive(),
    quantity: z.number().int().positive(),
    retailPriceMxn: z.string().regex(/^\d+\.\d{2}$/),
  })).min(1),
  shippingMethod: z.enum(['STANDARD', 'EXPRESS', 'PRINTFUL_FAST']).default('STANDARD'),
  address: addressSchema,
});

export const createOrderBodySchema = z.object({
  items: z.array(z.object({
    syncVariantId: z.number().int().positive(),
    quantity: z.number().int().positive(),
    retailPriceMxn: z.string().regex(/^\d+\.\d{2}$/),
  })).min(1),
  shippingMethod: z.enum(['STANDARD', 'EXPRESS', 'PRINTFUL_FAST']).default('STANDARD'),
  recipient: addressSchema.extend({
    name: z.string().min(1),
    phone: z.string().min(10),
    email: z.string().email(),
    taxNumber: z.string().optional(),
  }),
  retailCosts: z.object({
    currency: z.literal('MXN'),
    subtotal: z.string().regex(/^\d+\.\d{2}$/),
    shipping: z.string().regex(/^\d+\.\d{2}$/),
    tax: z.string().regex(/^\d+\.\d{2}$/),
    total: z.string().regex(/^\d+\.\d{2}$/),
  }),
});

const syncFileSchema = z.object({
  type: z.enum(['default', 'back', 'sleeve_left', 'sleeve_right', 'label_inside']),
  url: z.string().url(),
});

export const syncProductBodySchema = z.object({
  externalId: z.string().min(1),
  name: z.string().min(1).max(255),
  thumbnail: z.string().url(),
  variants: z.array(z.object({
    externalId: z.string().min(1),
    variantId: z.number().int().positive(),
    retailPrice: z.string().regex(/^\d+\.\d{2}$/),
    sku: z.string().optional(),
    files: z.array(syncFileSchema).min(1),
  })).min(1).max(100),
});

export const syncProductUpdateBodySchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    thumbnail: z.string().url().optional(),
    variants: z.array(z.object({
      syncVariantId: z.number().int().positive(),
      externalId: z.string().min(1).optional(),
      retailPrice: z.string().regex(/^\d+\.\d{2}$/).optional(),
      files: z.array(syncFileSchema).min(1).optional(),
    })).optional(),
  })
  .refine(
    (d) => Boolean(d.name ?? d.thumbnail ?? (d.variants && d.variants.length > 0)),
    { message: 'Envía name, thumbnail o al menos una variante a actualizar' },
  );

export type ShippingRatesBody = z.infer<typeof shippingRatesBodySchema>;
export type EstimateBody = z.infer<typeof estimateBodySchema>;
export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;
export type SyncProductBody = z.infer<typeof syncProductBodySchema>;
export type SyncProductUpdateBody = z.infer<typeof syncProductUpdateBodySchema>;
