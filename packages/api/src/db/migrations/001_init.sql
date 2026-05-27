-- migrations/001_init.sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE printful_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_sku VARCHAR(50) UNIQUE NOT NULL,
  printful_sync_product_id INT NOT NULL,
  printful_sync_variant_id INT NOT NULL UNIQUE,
  printful_catalog_variant_id INT NOT NULL,
  retail_price_mxn DECIMAL(10,2) NOT NULL,
  printful_cost_usd DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pf_products_status ON printful_products(status);

CREATE TABLE printful_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_order_id VARCHAR(50) UNIQUE NOT NULL,
  printful_order_id INT UNIQUE,
  customer_rfc VARCHAR(13),
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  total_mxn DECIMAL(10,2) NOT NULL,
  shipping_method VARCHAR(20),
  tracking_number VARCHAR(100),
  tracking_url TEXT,
  carrier VARCHAR(50),
  shipped_at TIMESTAMPTZ,
  cfdi_uuid VARCHAR(36),
  cfdi_xml_url TEXT,
  raw_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pf_orders_status ON printful_orders(status);
CREATE INDEX idx_pf_orders_printful_id ON printful_orders(printful_order_id);

CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  printful_order_id INT,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_unprocessed ON webhook_events(processed_at) WHERE processed_at IS NULL;
