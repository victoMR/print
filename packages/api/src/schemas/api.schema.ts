import { z } from 'zod';
import {
  shippingAddressSchema,
  orderRecipientSchema,
  orderCurrencySchema as mrpapsOrderCurrencySchema,
} from './mrpaps.schema.js';
import { postalCode5Schema } from './order.schema.js';

/** Dirección genérica para cuentas (MX o US). */
export const addressSchema = z.object({
  address1: z.string().min(1),
  address2: z.string().optional(),
  city: z.string().min(1),
  stateCode: z.string().min(2).max(3),
  countryCode: z.enum(['MX', 'US']),
  zip: postalCode5Schema,
});

export const orderCurrencySchema = mrpapsOrderCurrencySchema;

export const checkoutItemSchema = z.object({
  variantId: z.string().uuid(),
  syncVariantId: z.number().int().positive().optional(),
  quantity: z.number().int().positive(),
  retailPriceMxn: z.string().regex(/^\d+\.\d{2}$/).optional(),
  retailPriceUsd: z.string().regex(/^\d+\.\d{2}$/).optional(),
});

export const shippingRatesBodySchema = z.object({
  items: z.array(z.object({
    variantId: z.string().uuid(),
    syncVariantId: z.number().int().positive().optional(),
    quantity: z.number().int().positive(),
  })).min(1),
  address: shippingAddressSchema,
  recipient: z.object({
    name: z.string().min(1),
    phone: z.string().regex(/^\d{10}$/, 'El teléfono debe tener 10 dígitos sin espacios ni guiones'),
    email: z.string().email(),
  }).optional(),
});

export const estimateBodySchema = z.object({
  currency: orderCurrencySchema.default('MXN'),
  items: z.array(z.object({
    variantId: z.string().uuid(),
    syncVariantId: z.number().int().positive().optional(),
    quantity: z.number().int().positive(),
    retailPriceMxn: z.string().regex(/^\d+\.\d{2}$/).optional(),
    retailPriceUsd: z.string().regex(/^\d+\.\d{2}$/).optional(),
  })).min(1),
  shippingMethod: z.string().min(1).max(80).optional(),
  address: shippingAddressSchema,
}).superRefine((data, ctx) => {
  const expected = data.currency === 'USD' ? 'US' : 'MX';
  if (data.address.countryCode !== expected) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['address', 'countryCode'],
      message:
        expected === 'US'
          ? 'Esta tienda solo envía a Estados Unidos. Cambia a /mx para envíos a México.'
          : 'Esta tienda solo envía a México. Cambia a /us para envíos a Estados Unidos.',
    });
  }
});

export const createOrderBodySchema = z.object({
  items: z.array(z.object({
    variantId: z.string().uuid(),
    syncVariantId: z.number().int().positive().optional(),
    quantity: z.number().int().positive(),
    retailPriceMxn: z.string().regex(/^\d+\.\d{2}$/).optional(),
    retailPriceUsd: z.string().regex(/^\d+\.\d{2}$/).optional(),
  })).min(1),
  shippingMethod: z.string().min(1).max(80).optional(),
  recipient: orderRecipientSchema,
  retailCosts: z.object({
    currency: orderCurrencySchema,
    subtotal: z.string().regex(/^\d+\.\d{2}$/),
    shipping: z.string().regex(/^\d+\.\d{2}$/),
    tax: z.string().regex(/^\d+\.\d{2}$/),
    total: z.string().regex(/^\d+\.\d{2}$/),
  }),
  saveAccount: z.boolean().optional(),
  acceptedLegal: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar los Términos y el Aviso de Privacidad' }),
  }).optional(),
}).superRefine((data, ctx) => {
  const expected = data.retailCosts.currency === 'USD' ? 'US' : 'MX';
  if (data.recipient.countryCode !== expected) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['recipient', 'countryCode'],
      message:
        expected === 'US'
          ? 'Esta tienda solo envía a Estados Unidos. Cambia a /mx para envíos a México.'
          : 'Esta tienda solo envía a México. Cambia a /us para envíos a Estados Unidos.',
    });
  }
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

/** GET /api/v1/catalog/products query */
export const catalogProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(48).optional(),
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export type CatalogProductsQuery = z.infer<typeof catalogProductsQuerySchema>;

export type ShippingRatesBody = z.infer<typeof shippingRatesBodySchema>;
export type EstimateBody = z.infer<typeof estimateBodySchema>;
export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;
export type SyncProductBody = z.infer<typeof syncProductBodySchema>;
export type SyncProductUpdateBody = z.infer<typeof syncProductUpdateBodySchema>;
