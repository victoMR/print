export type MrpapsOrderStatus =
  | 'pendiente_pago'
  | 'pedido'
  | 'solicitado_imprenta'
  | 'recibido_imprenta'
  | 'enviado'
  | 'cancelado';
export type MrpapsProductStatus = 'active' | 'inactive' | 'archived';

export type MrpapsProductCategory = 'camiseta' | 'sudadera' | 'gorra' | 'tenis';

export type MrpapsUserRole = 'customer' | 'admin' | 'dev';

export type MrpapsUserRow = {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string;
  phone: string | null;
  tax_number: string | null;
  role: MrpapsUserRole;
  password_hash: string | null;
  email_verified_at: string | null;
  email_verification_token_hash: string | null;
  email_verification_expires_at: string | null;
  terms_accepted_at: string | null;
  terms_accepted_version: string | null;
  privacy_accepted_at: string | null;
  privacy_accepted_version: string | null;
  token_version: number;
  created_at: string;
  updated_at: string;
};

export type MrpapsAddressRow = {
  id: string;
  user_id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address1: string;
  address2: string | null;
  city: string;
  state_code: string;
  country_code: string;
  zip: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type MrpapsDesignRow = {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  file_url: string;
  thumbnail_url: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type GarmentTemplateView = {
  id: string;
  label: string;
  mockupUrl: string;
  mockupWidth?: number;
  mockupHeight?: number;
  contentBounds?: { x: number; y: number; width: number; height: number };
  colorMaskUrl: string | null;
  printArea: { x: number; y: number; width: number; height: number };
  printWidthIn: number;
  printHeightIn: number;
};

export type MrpapsGarmentTemplateRow = {
  id: string;
  slug: string;
  name: string;
  garment_type: 'tshirt' | 'hoodie' | 'cap';
  views: GarmentTemplateView[];
  sort_order: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

export type MrpapsProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  thumbnail_url: string;
  status: MrpapsProductStatus;
  template_id: string | null;
  composition: Record<string, unknown>;
  default_garment_color: string;
  category: MrpapsProductCategory;
  created_at: string;
  updated_at: string;
};

export type MrpapsProductVariantRow = {
  id: string;
  product_id: string;
  sku: string;
  size_label: string;
  color_label: string;
  retail_price_mxn: number;
  stock_quantity: number;
  low_stock_threshold: number;
  design_id: string | null;
  garment_color_hex: string;
  status: MrpapsProductStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type MrpapsOrderRow = {
  id: string;
  public_id: string;
  order_number: string;
  user_id: string | null;
  status: MrpapsOrderStatus;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_tax_number: string | null;
  ship_address1: string;
  ship_address2: string | null;
  ship_city: string;
  ship_state_code: string;
  ship_country_code: string;
  ship_zip: string;
  shipping_method: string;
  shipping_label: string | null;
  subtotal_mxn: number;
  shipping_mxn: number;
  tax_mxn: number;
  total_mxn: number;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
  internal_notes: string | null;
  ordered_at: string;
  printed_at: string | null;
  requested_at: string | null;
  received_at: string | null;
  shipped_at: string | null;
  stripe_payment_intent_id: string | null;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | null;
  confirmation_email_sent_at: string | null;
  terms_accepted_at: string | null;
  legal_accepted_version: string | null;
  created_at: string;
  updated_at: string;
};

export type MrpapsOrderItemRow = {
  id: string;
  order_id: string;
  variant_id: string;
  design_id: string | null;
  quantity: number;
  inventory_reserved_qty: number;
  unit_price_mxn: number;
  product_name: string;
  variant_label: string;
  sku: string;
  thumbnail_url: string | null;
  print_file_url: string | null;
  created_at: string;
};

export type MrpapsOrderWithItems = MrpapsOrderRow & {
  items: MrpapsOrderItemRow[];
};

export type MrpapsVariantWithProduct = MrpapsProductVariantRow & {
  product: MrpapsProductRow;
};
