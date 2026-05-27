import { z } from 'zod';

export const MX_STATE_CODES = [
  'AGU', 'BCN', 'BCS', 'CAM', 'CHP', 'CHH', 'CMX', 'COA', 'COL', 'DUR',
  'GUA', 'GRO', 'HID', 'JAL', 'MEX', 'MIC', 'MOR', 'NAY', 'NLE', 'OAX',
  'PUE', 'QUE', 'ROO', 'SLP', 'SIN', 'SON', 'TAB', 'TAM', 'TLA', 'VER',
  'YUC', 'ZAC',
] as const;

export const mxStateCodeSchema = z.enum(MX_STATE_CODES);

export const OrderInput = z.object({
  external_id: z.string().min(1),
  shipping: z.enum(['STANDARD', 'EXPRESS', 'PRINTFUL_FAST']).default('STANDARD'),
  recipient: z.object({
    name: z.string().min(1),
    address1: z.string().min(1),
    address2: z.string().optional(),
    city: z.string().min(1),
    state_code: mxStateCodeSchema,
    country_code: z.literal('MX'),
    zip: z.string().regex(/^\d{5}$/),
    phone: z.string().min(10),
    email: z.string().email(),
    tax_number: z.string().optional(),
  }),
  items: z.array(z.object({
    sync_variant_id: z.number().int().positive(),
    quantity: z.number().int().positive(),
    retail_price: z.string().regex(/^\d+\.\d{2}$/),
  })).min(1),
  retail_costs: z.object({
    currency: z.literal('MXN'),
    subtotal: z.string().regex(/^\d+\.\d{2}$/),
    shipping: z.string().regex(/^\d+\.\d{2}$/),
    tax: z.string().regex(/^\d+\.\d{2}$/),
    total: z.string().regex(/^\d+\.\d{2}$/),
  }),
});

export type OrderInputType = z.infer<typeof OrderInput>;

export const OrderEstimateInput = OrderInput.extend({
  external_id: z.string().min(1).optional(),
});

export const ConfirmOrderParams = z.object({
  printfulOrderId: z.coerce.number().int().positive(),
  internalOrderId: z.string().min(1),
});

export const SyncProductInput = z.object({
  external_id: z.string().min(1),
  name: z.string().min(1).max(255),
  thumbnail: z.string().url(),
  variants: z.array(z.object({
    external_id: z.string().min(1),
    variant_id: z.number().int().positive(),
    retail_price: z.string().regex(/^\d+\.\d{2}$/),
    sku: z.string().optional(),
    files: z.array(z.object({
      type: z.enum(['default', 'back', 'sleeve_left', 'sleeve_right', 'label_inside']),
      url: z.string().url(),
    })).min(1),
  })).max(100),
});

export type SyncProductInputType = z.infer<typeof SyncProductInput>;

export const ShippingRatesInput = z.object({
  recipient: OrderInput.shape.recipient,
  items: z.array(z.object({
    sync_variant_id: z.number().int().positive(),
    quantity: z.number().int().positive(),
    retail_price: z.string().regex(/^\d+\.\d{2}$/).optional(),
  })).min(1),
  // Pedimos USD/EUR a Printful; convertimos nosotros a MXN con Banxico.
  // `MXN` se deja para compatibilidad en flujos legacy.
  currency: z.enum(['USD', 'EUR', 'MXN']).default('USD'),
});

export type ShippingRatesInputType = z.infer<typeof ShippingRatesInput>;
