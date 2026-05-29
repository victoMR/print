export type CatalogProductSummary = {
  id: string;
  slug: string;
  name: string;
  thumbnail: string;
  priceFromMxn: string;
  variantCount: number;
};

export type CatalogProductDetail = {
  id: string;
  slug: string;
  name: string;
  description: string;
  thumbnail: string;
  variants: Array<{
    variantId: string;
    size: string;
    color: string;
    retailPriceMxn: string;
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
    orderNumber?: string;
    status: string;
    paymentClientSecret: string | null;
  };
};

export type OrderStatusResponse = {
  data: {
    internalOrderId: string;
    orderNumber?: string;
    status: MrpapsOrderStatus;
    totalMxn: string;
    trackingNumber: string | null;
    trackingUrl: string | null;
    carrier?: string | null;
    shippedAt: string | null;
    printedAt?: string | null;
    items?: Array<{
      productName: string;
      variantLabel: string;
      quantity: number;
      unitPriceMxn: string;
    }>;
  };
};

export type MrpapsOrderStatus = "pedido" | "impreso" | "enviado" | "cancelado";

export const ORDER_STATUS_LABELS: Record<MrpapsOrderStatus, string> = {
  pedido: "Pedido recibido",
  impreso: "Impreso",
  enviado: "Enviado",
  cancelado: "Cancelado",
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
  }>;
};

export type AdminInventoryRow = {
  variantId: string;
  sku: string;
  productId: string;
  productName: string;
  productSlug: string;
  size: string;
  color: string;
  retailPriceMxn: string;
  stockQuantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  status: string;
  designId: string | null;
};

export type AdminDesign = {
  id: string;
  name: string;
  description: string | null;
  fileUrl: string;
  thumbnailUrl: string | null;
  tags: string[];
  createdAt: string;
};

export type AdminProductSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  status: string;
  variantCount: number;
};

export type AdminProductVariant = {
  id: string;
  sku: string;
  size: string;
  color: string;
  retailPriceMxn: string;
  stockQuantity: number;
  status: string;
  designId: string | null;
};

export type AdminProductDetail = AdminProductSummary & {
  variants: AdminProductVariant[];
};
