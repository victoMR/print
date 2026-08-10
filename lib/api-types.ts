import type { ProductCategory } from "./product-categories";

export type CatalogProductSummary = {
  id: string;
  slug: string;
  name: string;
  /** Traducción automática al inglés (puede ser null si aún no se ha traducido). */
  nameEn: string | null;
  thumbnail: string;
  category: ProductCategory;
  priceFromMxn: string;
  /** null si ningún variante tiene precio en USD todavía. */
  priceFromUsd: string | null;
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
  /** Traducción automática al inglés (puede ser null si aún no se ha traducido). */
  nameEn: string | null;
  descriptionEn: string | null;
  thumbnail: string;
  /** Fotos del producto en orden (la primera es la portada). */
  images?: string[];
  /** Foto por cada color disponible del producto. */
  colorImages?: Array<{ color: string; imageUrl: string }>;
  category: ProductCategory;
  preview?: ProductPreviewData | null;
  variants: Array<{
    variantId: string;
    size: string;
    color: string;
    retailPriceMxn: string;
    /** null si esta variante no tiene precio en USD todavía. */
    retailPriceUsd: string | null;
    garmentColorHex?: string;
    inStock: boolean;
    maxQuantity?: number;
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
    currency: "MXN" | "USD";
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
  stripePaymentIntentId?: string | null;
  currency: "MXN" | "USD";
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
    subtotalMxn: string | null;
    shippingMxn: string | null;
    taxMxn: string | null;
    totalMxn: string | null;
    subtotalUsd: string | null;
    shippingUsd: string | null;
    taxUsd: string | null;
    totalUsd: string | null;
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
    unitPriceUsd: string | null;
    lineTotalUsd: string | null;
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
  | "pendiente_pago"
  | "pedido"
  | "solicitado_imprenta"
  | "recibido_imprenta"
  | "enviado"
  | "cancelado";

export const ORDER_STATUS_LABELS: Record<MrpapsOrderStatus, string> = {
  pendiente_pago: "Pago pendiente",
  pedido: "Pedido recibido",
  solicitado_imprenta: "Solicitado a imprenta",
  recibido_imprenta: "Recibido de imprenta",
  enviado: "Enviado al cliente",
  cancelado: "Cancelado",
};

/** Transiciones permitidas en el panel admin (fulfillment manual). */
export const ORDER_STATUS_NEXT: Record<MrpapsOrderStatus, MrpapsOrderStatus[]> = {
  pendiente_pago: ["cancelado"],
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
  countryCode: "MX" | "US";
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
  /** null si esta variante no tiene precio en USD todavía. */
  retailPriceUsd?: string | null;
  quantity: number;
  thumbnail: string;
  /** Tope por línea (catálogo); por defecto 100 en cliente. */
  maxQuantity?: number;
  /** El sync detectó que no hay existencias — no se incluye en el pedido. */
  outOfStock?: boolean;
};

export type CartSyncResponse = {
  data: CartItem[];
};

export type AdminOrderSummary = {
  publicId: string;
  orderNumber: string;
  status: MrpapsOrderStatus;
  paymentStatus: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  currency: "MXN" | "USD";
  market: "mx" | "us";
  shipCountryCode: string;
  totalMxn: string | null;
  totalUsd: string | null;
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
    unitPriceUsd?: string | null;
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
  galleryUrls?: string[];
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
  /** null si esta variante no tiene precio en USD todavía. */
  retailPriceUsd: string | null;
  /** Unidades en inventario físico por mercado — 0 = agotado (no ilimitado). */
  stockQuantityMx: number;
  stockQuantityUs: number;
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
  /** Colores del producto con su foto (definen qué colores están disponibles). */
  colorImages?: Array<{ color: string; imageUrl: string }>;
  variants: AdminProductVariant[];
};

export type AdminAnalyticsPeriod = "week" | "month" | "quarter" | "year" | "custom";

export type AdminMarketSummary = {
  market: "mx" | "us";
  label: string;
  currency: "MXN" | "USD";
  paidOrders: number;
  revenue: string;
  avgOrder: string;
  itemsSold: number;
  uniqueCustomers: number;
  refundedOrders: number;
  cancelledOrders: number;
};

export type AdminDashboardData = {
  period: { key: AdminAnalyticsPeriod; label: string; from: string; to: string };
  summary: {
    paidOrders: number;
    revenueMxn: string;
    avgOrderMxn: string;
    revenueUsd: string;
    avgOrderUsd: string;
    itemsSold: number;
    refundedOrders: number;
    cancelledOrders: number;
    uniqueCustomers: number;
  };
  byMarket: AdminMarketSummary[];
  series: Array<{
    bucket: string;
    label: string;
    orders: number;
    revenueMxn: string;
    revenueUsd: string;
  }>;
  byStatus: Array<{ status: string; count: number }>;
  topProducts: Array<{
    productName: string;
    variantLabel: string;
    sku: string;
    quantity: number;
    currency: "MXN" | "USD";
    revenue: string;
    revenueMxn: string;
  }>;
};
