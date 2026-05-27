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
    syncVariantId: number;
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
    status: string;
    paymentClientSecret: string | null;
  };
};

export type OrderStatusResponse = {
  data: {
    internalOrderId: string;
    status: string;
    totalMxn: string;
    trackingNumber: string | null;
    trackingUrl: string | null;
    shippedAt: string | null;
  };
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
  syncVariantId: number;
  productSlug: string;
  productName: string;
  variantLabel: string;
  retailPriceMxn: string;
  quantity: number;
  thumbnail: string;
};

export type PrintfulCatalogProduct = {
  id: number;
  title: string;
  type: string;
  brand: string;
  model: string;
  image: string;
  variant_count: number;
};

export type PrintfulSyncProduct = {
  id: number;
  external_id: string;
  name: string;
  variants: number;
  synced: number;
  thumbnail_url: string;
};

export type SyncProductPayload = {
  externalId: string;
  name: string;
  thumbnail: string;
  variants: Array<{
    externalId: string;
    variantId: number;
    retailPrice: string;
    sku?: string;
    files: Array<{
      type: "default" | "back" | "sleeve_left" | "sleeve_right" | "label_inside";
      url: string;
    }>;
  }>;
};

export type StoreProductDetailData = {
  sync_product: {
    id: number;
    external_id: string;
    name?: string;
    /** URL miniatura (API ya unifica desde thumbnail / thumbnail_url de Printful) */
    thumbnail?: string;
    thumbnail_url?: string;
  };
  sync_variants: Array<{
    id: number;
    external_id: string;
    variant_id: number;
    retail_price: string;
  }>;
};

export type StoreProductDetailResponse = { data: StoreProductDetailData };

export type SyncProductUpdatePayload = {
  name?: string;
  thumbnail?: string;
  variants?: Array<{
    syncVariantId: number;
    externalId?: string;
    retailPrice?: string;
    files?: Array<{
      type: "default" | "back" | "sleeve_left" | "sleeve_right" | "label_inside";
      url: string;
    }>;
  }>;
};
