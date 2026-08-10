import { z } from 'zod';
import { mxStateCodeSchema, postalCode5Schema, postalCodeUsSchema, usStateCodeSchema } from './order.schema.js';
import { CUSTOMER_PASSWORD_MAX, CUSTOMER_PASSWORD_MIN } from './customer-auth.schema.js';
import { assetUrlSchema } from './asset-url.schema.js';
import { productCategorySchema } from '../lib/product-categories.js';
import { MAX_CART_LINE_QUANTITY } from '../lib/cart-limits.js';

const productGalleryUrlsSchema = z.array(assetUrlSchema).max(12);

const cartQuantitySchema = z.number().int().positive().max(MAX_CART_LINE_QUANTITY);

export const mrpapsOrderStatusSchema = z.enum([
  'pendiente_pago',
  'pedido',
  'solicitado_imprenta',
  'recibido_imprenta',
  'enviado',
  'cancelado',
]);
export const shippingMethodSchema = z.string().min(1).max(80);

export const checkoutItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: cartQuantitySchema,
  retailPriceMxn: z.string().regex(/^\d+\.\d{2}$/).optional(),
  retailPriceUsd: z.string().regex(/^\d+\.\d{2}$/).optional(),
});

export const orderCurrencySchema = z.enum(['MXN', 'USD']);

export const cartSyncBodySchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: cartQuantitySchema,
      }),
    )
    .min(1)
    .max(50),
});

const addressBase = {
  address1: z.string().min(1),
  address2: z.string().optional(),
  city: z.string().min(1),
};

export const mxShippingAddressSchema = z.object({
  ...addressBase,
  zip: postalCode5Schema,
  stateCode: mxStateCodeSchema,
  countryCode: z.literal('MX'),
});

export const usShippingAddressSchema = z.object({
  ...addressBase,
  zip: postalCodeUsSchema,
  stateCode: usStateCodeSchema,
  countryCode: z.literal('US'),
});

/** Dirección de envío: MX (3-letter state) o US (2-letter state). */
export const shippingAddressSchema = z.union([mxShippingAddressSchema, usShippingAddressSchema]);

const recipientExtrasSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  email: z.string().email(),
  taxNumber: z.string().optional(),
});

export const orderRecipientSchema = z.union([
  mxShippingAddressSchema.merge(recipientExtrasSchema),
  usShippingAddressSchema.merge(recipientExtrasSchema),
]);

export const shippingRatesBodySchema = z.object({
  items: z.array(z.object({
    variantId: z.string().uuid(),
    quantity: cartQuantitySchema,
  })).min(1),
  address: shippingAddressSchema,
});

export const estimateBodySchema = z.object({
  currency: orderCurrencySchema.default('MXN'),
  items: z.array(z.object({
    variantId: z.string().uuid(),
    quantity: cartQuantitySchema,
    retailPriceMxn: z.string().regex(/^\d+\.\d{2}$/).optional(),
    retailPriceUsd: z.string().regex(/^\d+\.\d{2}$/).optional(),
  })).min(1),
  shippingMethod: shippingMethodSchema.optional(),
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
    quantity: cartQuantitySchema,
    retailPriceMxn: z.string().regex(/^\d+\.\d{2}$/).optional(),
    retailPriceUsd: z.string().regex(/^\d+\.\d{2}$/).optional(),
  })).min(1),
  shippingMethod: shippingMethodSchema.optional(),
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
  /** Solo desde JWT en checkout; no enviar desde el cliente */
  customerUserId: z.string().uuid().optional(),
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
  // Nullable para permitir borrar el precio en USD (vuelve a "no disponible en USD").
  retailPriceUsd: z.number().positive().nullable().optional(),
  stockQuantityMx: z.number().int().min(0).optional(),
  stockQuantityUs: z.number().int().min(0).optional(),
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
  galleryUrls: productGalleryUrlsSchema.optional(),
  /** Crea variante única «Única / Estándar» para la tienda. */
  retailPriceMxn: z.number().positive().optional(),
  retailPriceUsd: z.number().positive().optional(),
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
  galleryUrls: productGalleryUrlsSchema.optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  templateId: z.string().uuid().nullable().optional(),
  composition: productCompositionSchema.optional(),
  defaultGarmentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  category: productCategorySchema.optional(),
  // Corrección manual de la traducción automática al inglés — al fijar el
  // override también se marca *IsManual para que no se sobreescriba después.
  nameEnOverride: z.string().max(255).nullable().optional(),
  descriptionEnOverride: z.string().max(5000).nullable().optional(),
  nameEnIsManual: z.boolean().optional(),
  descriptionEnIsManual: z.boolean().optional(),
});

export const createVariantSchema = z.object({
  sku: z.string().min(1).max(50),
  sizeLabel: z.string().min(1).max(50),
  colorLabel: z.string().min(1).max(50),
  retailPriceMxn: z.number().positive(),
  retailPriceUsd: z.number().positive().optional(),
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

// ─── Gestión de usuarios (solo dev) ──────────────────────────────────────────

export const adminUserRoleSchema = z.enum(['customer', 'admin', 'dev']);

export const adminListUsersQuerySchema = z.object({
  role: adminUserRoleSchema.optional(),
  search: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const adminCreateUserSchema = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  fullName: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(128),
  role: z.enum(['admin', 'dev']).default('admin'),
});

export const adminUpdateUserRoleSchema = z.object({
  role: adminUserRoleSchema,
});

export const adminResetUserPasswordSchema = z.object({
  password: z.string().min(CUSTOMER_PASSWORD_MIN).max(CUSTOMER_PASSWORD_MAX),
});

export type AdminCreateUserBody = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUserRoleBody = z.infer<typeof adminUpdateUserRoleSchema>;
export type AdminResetUserPasswordBody = z.infer<typeof adminResetUserPasswordSchema>;
