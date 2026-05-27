export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface PrintfulProductRow {
  id: string;
  internal_sku: string;
  printful_sync_product_id: number;
  printful_sync_variant_id: number;
  printful_catalog_variant_id: number;
  retail_price_mxn: number;
  printful_cost_usd: number;
  status: string;
  last_synced_at: string;
  created_at: string;
}

export interface PrintfulProductInsert {
  internal_sku: string;
  printful_sync_product_id: number;
  printful_sync_variant_id: number;
  printful_catalog_variant_id: number;
  retail_price_mxn: number | string;
  printful_cost_usd: number | string;
  status?: string;
  last_synced_at?: string;
}

export interface PrintfulOrderRow {
  id: string;
  internal_order_id: string;
  printful_order_id: number | null;
  customer_rfc: string | null;
  status: string;
  total_mxn: number;
  shipping_method: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
  shipped_at: string | null;
  cfdi_uuid: string | null;
  cfdi_xml_url: string | null;
  raw_payload: Json;
  created_at: string;
  updated_at: string;
}

export interface PrintfulOrderInsert {
  internal_order_id: string;
  printful_order_id?: number | null;
  customer_rfc?: string | null;
  status?: string;
  total_mxn: number | string;
  shipping_method?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  carrier?: string | null;
  shipped_at?: string | null;
  cfdi_uuid?: string | null;
  cfdi_xml_url?: string | null;
  raw_payload: Json;
}

export interface PrintfulOrderUpdate {
  printful_order_id?: number | null;
  customer_rfc?: string | null;
  status?: string;
  total_mxn?: number | string;
  shipping_method?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  carrier?: string | null;
  shipped_at?: string | null;
  cfdi_uuid?: string | null;
  cfdi_xml_url?: string | null;
  raw_payload?: Json;
  updated_at?: string;
}

export interface WebhookEventRow {
  id: string;
  event_type: string;
  printful_order_id: number | null;
  payload: Json;
  processed_at: string | null;
  error: string | null;
  received_at: string;
}

export interface WebhookEventInsert {
  event_type: string;
  printful_order_id?: number | null;
  payload: Json;
}

export interface Database {
  public: {
    Tables: {
      printful_products: {
        Row: PrintfulProductRow;
        Insert: PrintfulProductInsert;
        Update: Partial<PrintfulProductInsert>;
        Relationships: [];
      };
      printful_orders: {
        Row: PrintfulOrderRow;
        Insert: PrintfulOrderInsert;
        Update: PrintfulOrderUpdate;
        Relationships: [];
      };
      webhook_events: {
        Row: WebhookEventRow;
        Insert: WebhookEventInsert;
        Update: Partial<WebhookEventInsert & { processed_at?: string | null; error?: string | null }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
