import { z } from 'zod';
import { mxStateCodeSchema } from './order.schema.js';

export const mrpapsOrderStatusSchema = z.enum(['pedido', 'impreso', 'enviado', 'cancelado']);
export const shippingMethodSchema = z.enum(['STANDARD', 'EXPRESS']);

export const checkoutItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().positive(),
  retailPriceMxn: z.string().regex(/^\d+\.\d{2}$/).optional(),
});

export const shippingRatesBodySchema = z.object({
  items: z.array(z.object({
    variantId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
  address: z.object({
    address1: z.string().min(1),
    address2: z.string().optional(),
    city: z.string().min(1),
    stateCode: mxStateCodeSchema,
    countryCode: z.literal('MX'),
    zip: z.string().regex(/^\d{5}$/),
  }),
});

export const estimateBodySchema = z.object({
  items: z.array(z.object({
    variantId: z.string().uuid(),
    quantity: z.number().int().positive(),
    retailPriceMxn: z.string().regex(/^\d+\.\d{2}$/),
  })).min(1),
  shippingMethod: shippingMethodSchema.default('STANDARD'),
  address: shippingRatesBodySchema.shape.address,
});

export const createOrderBodySchema = z.object({
  items: z.array(z.object({
    variantId: z.string().uuid(),
    quantity: z.number().int().positive(),
    retailPriceMxn: z.string().regex(/^\d+\.\d{2}$/),
  })).min(1),
  shippingMethod: shippingMethodSchema.default('STANDARD'),
  recipient: z.object({
    name: z.string().min(1),
    phone: z.string().min(10),
    email: z.string().email(),
    taxNumber: z.string().optional(),
    address1: z.string().min(1),
    address2: z.string().optional(),
    city: z.string().min(1),
    stateCode: mxStateCodeSchema,
    countryCode: z.literal('MX'),
    zip: z.string().regex(/^\d{5}$/),
  }),
  retailCosts: z.object({
    currency: z.literal('MXN'),
    subtotal: z.string().regex(/^\d+\.\d{2}$/),
    shipping: z.string().regex(/^\d+\.\d{2}$/),
    tax: z.string().regex(/^\d+\.\d{2}$/),
    total: z.string().regex(/^\d+\.\d{2}$/),
  }),
  saveAccount: z.boolean().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: mrpapsOrderStatusSchema,
  trackingNumber: z.string().optional().nullable(),
  trackingUrl: z.string().url().optional().nullable(),
  carrier: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  note: z.string().optional(),
});

export const createDesignSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  fileUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateInventorySchema = z.object({
  stockQuantity: z.number().int().min(0),
});

export const updateVariantAdminSchema = z.object({
  retailPriceMxn: z.number().positive().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  designId: z.string().uuid().nullable().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().max(5000).optional(),
  thumbnailUrl: z.string().url(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().max(5000).optional(),
  thumbnailUrl: z.string().url().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});

export const createVariantSchema = z.object({
  sku: z.string().min(1).max(50),
  sizeLabel: z.string().min(1).max(50),
  colorLabel: z.string().min(1).max(50),
  retailPriceMxn: z.number().positive(),
  stockQuantity: z.number().int().min(0).default(0),
  designId: z.string().uuid().nullable().optional(),
});

export type MrpapsShippingRatesBody = z.infer<typeof shippingRatesBodySchema>;
export type MrpapsEstimateBody = z.infer<typeof estimateBodySchema>;
export type MrpapsCreateOrderBody = z.infer<typeof createOrderBodySchema>;
