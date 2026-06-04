import type { ProductCategory } from "./product-categories";

export type CatalogProductSummary = {
  id: string;
  slug: string;
  name: string;
  thumbnail: string;
  category: ProductCategory;
  priceFromMxn: string;
  variantCount: number;
  hasComposition?: boolean;
};

export type ProductPreviewData = {
  garmentColor: string;
  composition: ProductComposition;
  template: {
    id: string;
    slug: string;
    name: string;
    garmentType: "tshirt" | "hoodie" | "cap";
    views: GarmentTemplateView[];
  };
};

export type CatalogProductDetail = {
  id: string;
  slug: string;
  name: string;
  description: string;
  thumbnail: string;
  category: ProductCategory;
  preview?: ProductPreviewData | null;
  variants: Array<{
    variantId: string;
    size: string;
    color: string;
    retailPriceMxn: string;
    garmentColorHex?: string;
    inStock: boolean;
  }>;
};

export type CatalogListResponse = {
  data: CatalogProductSummary[];
  meta: { page: number; limit: number; total: number };
};

export type CatalogDetailResponse = {
  data: CatalogProductDetail;
};

export type ShippingRate = {
  id: string;
  name: string;
  priceMxn: string;
  minDays: number;
  maxDays: number;
  carrier?: string;
  source?: "envia" | "local";
  estimated?: boolean;
};

export type AdminShippingQuoteResult = {
  rates: ShippingRate[];
  provider: "envia" | "local";
  enviaConfigured: boolean;
  meta: {
    itemCount: number;
    weightKg: number;
    originZip: string;
    destinationZip: string;
    carriersQueried?: string[];
  };
};

export type ShippingRatesResponse = {
  data: { rates: ShippingRate[] };
};

export type EstimateResponse = {
  data: {
    currency: "MXN";
    subtotal: string;
    shipping: string;
    tax: string;
    total: string;
    shippingMethod?: string;
  };
};

export type CreateOrderResponse = {
  data: {
    internalOrderId: string;
    trackingCode: string;
    orderNumber?: string;
    status: string;
    paymentClientSecret: string | null;
  };
};

export type OrderDetail = {
  publicId: string;
  trackingCode: string;
  orderNumber: string;
  status: MrpapsOrderStatus;
  orderedAt: string;
  paymentStatus: string | null;
  customer: {
    name: string;
    email: string;
    phone: string;
    taxNumber: string | null;
  };
  shipping: {
    label: string | null;
    method: string;
    address1: string;
    address2: string | null;
    city: string;
    stateCode: string;
    zip: string;
    countryCode: string;
  };
  totals: {
    subtotalMxn: string;
    shippingMxn: string;
    taxMxn: string;
    totalMxn: string;
  };
  tracking: {
    number: string | null;
    url: string | null;
    carrier: string | null;
    shippedAt: string | null;
  };
  items: Array<{
    id: string;
    productName: string;
    variantLabel: string;
    sku: string;
    quantity: number;
    unitPriceMxn: string;
    lineTotalMxn: string;
    thumbnailUrl: string | null;
    printFileUrl: string | null;
  }>;
  timeline: Array<{
    status: MrpapsOrderStatus;
    label: string;
    at: string | null;
    done: boolean;
    current: boolean;
  }>;
  statusHistory: Array<{
    fromStatus: MrpapsOrderStatus | null;
    toStatus: MrpapsOrderStatus;
    note: string | null;
    at: string;
    createdBy: string | null;
  }>;
  internalNotes?: string | null;
};

export type OrderDetailResponse = { data: OrderDetail };

/** @deprecated Usar OrderDetailResponse */
export type OrderStatusResponse = OrderDetailResponse;

export type MrpapsOrderStatus =
  | "pedido"
  | "solicitado_imprenta"
  | "recibido_imprenta"
  | "enviado"
  | "cancelado";

export const ORDER_STATUS_LABELS: Record<MrpapsOrderStatus, string> = {
  pedido: "Pedido recibido",
  solicitado_imprenta: "Solicitado a imprenta",
  recibido_imprenta: "Recibido de imprenta",
  enviado: "Enviado al cliente",
  cancelado: "Cancelado",
};

/** Transiciones permitidas en el panel admin (fulfillment manual). */
export const ORDER_STATUS_NEXT: Record<MrpapsOrderStatus, MrpapsOrderStatus[]> = {
  pedido: ["solicitado_imprenta", "cancelado"],
  solicitado_imprenta: ["recibido_imprenta", "cancelado"],
  recibido_imprenta: ["enviado", "cancelado"],
  enviado: [],
  cancelado: [],
};

export type CheckoutAddress = {
  address1: string;
  address2?: string;
  city: string;
  stateCode: string;
  countryCode: "MX";
  zip: string;
};

export type CheckoutRecipient = CheckoutAddress & {
  name: string;
  phone: string;
  email: string;
  taxNumber?: string;
};

export type CartItem = {
  variantId: string;
  productSlug: string;
  productName: string;
  variantLabel: string;
  retailPriceMxn: string;
  quantity: number;
  thumbnail: string;
};

export type AdminOrderSummary = {
  publicId: string;
  orderNumber: string;
  status: MrpapsOrderStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalMxn: string;
  shippingLabel: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  carrier: string | null;
  orderedAt: string;
  printedAt: string | null;
  shippedAt: string | null;
  itemCount: number;
  items: Array<{
    productName: string;
    variantLabel: string;
    sku: string;
    quantity: number;
    unitPriceMxn: string;
    thumbnailUrl?: string | null;
    printFileUrl?: string | null;
  }>;
};

export type AdminDesign = {
  id: string;
  name: string;
  description: string | null;
  fileUrl: string;
  thumbnailUrl: string | null;
  tags: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type GarmentTemplateView = {
  id: string;
  label: string;
  mockupUrl: string;
  mockupWidth?: number;
  mockupHeight?: number;
  /** Recorte de la prenda dentro del PNG (sin márgenes negros). */
  contentBounds?: { x: number; y: number; width: number; height: number };
  colorMaskUrl: string | null;
  printArea: { x: number; y: number; width: number; height: number };
  printWidthIn: number;
  printHeightIn: number;
};

export type GarmentTemplate = {
  id: string;
  slug: string;
  name: string;
  garmentType: "tshirt" | "hoodie" | "cap";
  views: GarmentTemplateView[];
  sortOrder: number;
};

export type ProductPlacement = {
  designId: string;
  designUrl?: string;
  x: number;
  y: number;
  width: number;
  rotation: number;
};

export type ProductCompositionView = {
  placements: ProductPlacement[];
  printFileUrl?: string;
};

export type ProductComposition = {
  templateId: string;
  garmentColor: string;
  primaryPrintView?: string;
  views: Record<string, ProductCompositionView>;
};

export type AdminProductSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  status: string;
  category: ProductCategory;
  variantCount: number;
};

export type AdminProductVariant = {
  id: string;
  sku: string;
  size: string;
  color: string;
  retailPriceMxn: string;
  status: "active" | "inactive" | "archived";
  designId: string | null;
  garmentColorHex: string;
  /** Líneas en pedidos que referencian esta variante (no se puede borrar). */
  orderItemCount: number;
  sortOrder: number;
};

export type AdminProductDetail = AdminProductSummary & {
  templateId?: string | null;
  defaultGarmentColor?: string;
  composition?: ProductComposition;
  variants: AdminProductVariant[];
};
