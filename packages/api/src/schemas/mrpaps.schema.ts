import { z } from 'zod';
import { mxStateCodeSchema } from './order.schema.js';
import { CUSTOMER_PASSWORD_MAX, CUSTOMER_PASSWORD_MIN } from './customer-auth.schema.js';
import { assetUrlSchema } from './asset-url.schema.js';
import { productCategorySchema } from '../lib/product-categories.js';

export const mrpapsOrderStatusSchema = z.enum([
  'pedido',
  'solicitado_imprenta',
  'recibido_imprenta',
  'enviado',
  'cancelado',
]);
export const shippingMethodSchema = z.string().min(1).max(80);

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
  shippingMethod: shippingMethodSchema.optional(),
  address: shippingRatesBodySchema.shape.address,
});

export const createOrderBodySchema = z.object({
  items: z.array(z.object({
    variantId: z.string().uuid(),
    quantity: z.number().int().positive(),
    retailPriceMxn: z.string().regex(/^\d+\.\d{2}$/),
  })).min(1),
  shippingMethod: shippingMethodSchema.optional(),
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
  /** Solo desde JWT en checkout; no enviar desde el cliente */
  customerUserId: z.string().uuid().optional(),
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
  fileUrl: assetUrlSchema,
  thumbnailUrl: assetUrlSchema.optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const placementSchema = z.object({
  designId: z.string().uuid(),
  designUrl: assetUrlSchema.optional(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0.01).max(1),
  rotation: z.number().default(0),
});

const compositionViewSchema = z.object({
  placements: z.array(placementSchema),
  printFileUrl: assetUrlSchema.optional(),
});

export const productCompositionSchema = z.object({
  templateId: z.string().uuid(),
  garmentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  primaryPrintView: z.string().optional(),
  views: z.record(z.string(), compositionViewSchema),
});

export const updateVariantAdminSchema = z.object({
  sku: z.string().min(1).max(50).optional(),
  sizeLabel: z.string().min(1).max(50).optional(),
  colorLabel: z.string().min(1).max(50).optional(),
  retailPriceMxn: z.number().positive().optional(),
  designId: z.string().uuid().nullable().optional(),
  garmentColorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});

export const bootstrapPasswordSchema = z.object({
  secret: z.string().min(16, 'Secret demasiado corto'),
  email: z.string().email('Correo inválido').transform((v) => v.trim().toLowerCase()),
  password: z
    .string()
    .min(CUSTOMER_PASSWORD_MIN)
    .max(CUSTOMER_PASSWORD_MAX),
  fullName: z.string().trim().min(1).max(120).optional(),
  role: z.enum(['admin', 'customer']).default('admin'),
});

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().max(5000).optional(),
  thumbnailUrl: assetUrlSchema.optional(),
  /** Crea variante única «Única / Estándar» para la tienda. */
  retailPriceMxn: z.number().positive().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  templateId: z.string().uuid().optional(),
  composition: productCompositionSchema.optional(),
  defaultGarmentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  category: productCategorySchema.optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().max(5000).optional(),
  thumbnailUrl: assetUrlSchema.optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  templateId: z.string().uuid().nullable().optional(),
  composition: productCompositionSchema.optional(),
  defaultGarmentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  category: productCategorySchema.optional(),
});

export const createVariantSchema = z.object({
  sku: z.string().min(1).max(50),
  sizeLabel: z.string().min(1).max(50),
  colorLabel: z.string().min(1).max(50),
  retailPriceMxn: z.number().positive(),
  designId: z.string().uuid().nullable().optional(),
  garmentColorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export type MrpapsShippingRatesBody = z.infer<typeof shippingRatesBodySchema>;

export const adminShippingQuoteSchema = z.object({
  itemCount: z.number().int().positive().default(1),
  address: shippingRatesBodySchema.shape.address,
});

export type AdminShippingQuoteBody = z.infer<typeof adminShippingQuoteSchema>;
export type MrpapsEstimateBody = z.infer<typeof estimateBodySchema>;
export type MrpapsCreateOrderBody = z.infer<typeof createOrderBodySchema>;
