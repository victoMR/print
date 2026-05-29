-- Mr. Paps — esquema principal (Supabase / PostgreSQL)
-- Ejecutar en SQL Editor después de 001/002 o en proyecto nuevo.
-- Tablas con prefijo mrpaps_

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE mrpaps_order_status AS ENUM ('pedido', 'impreso', 'enviado', 'cancelado');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE mrpaps_product_status AS ENUM ('active', 'inactive', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Usuarios (cuenta opcional; pedidos invitado usan snapshot en mrpaps_orders)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mrpaps_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  tax_number VARCHAR(13),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mrpaps_users_email_lower UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_mrpaps_users_auth ON mrpaps_users (auth_user_id) WHERE auth_user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Direcciones guardadas (solo usuarios registrados)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mrpaps_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES mrpaps_users (id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Principal',
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address1 TEXT NOT NULL,
  address2 TEXT,
  city TEXT NOT NULL,
  state_code CHAR(3) NOT NULL,
  country_code CHAR(2) NOT NULL DEFAULT 'MX',
  zip CHAR(5) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mrpaps_addresses_user ON mrpaps_addresses (user_id);

-- ---------------------------------------------------------------------------
-- Diseños
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mrpaps_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES mrpaps_users (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mrpaps_designs_user ON mrpaps_designs (user_id);

-- ---------------------------------------------------------------------------
-- Catálogo e inventario
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mrpaps_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT NOT NULL,
  status mrpaps_product_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mrpaps_products_status ON mrpaps_products (status);

CREATE TABLE IF NOT EXISTS mrpaps_product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES mrpaps_products (id) ON DELETE CASCADE,
  sku VARCHAR(50) NOT NULL UNIQUE,
  size_label TEXT NOT NULL,
  color_label TEXT NOT NULL,
  retail_price_mxn DECIMAL(10, 2) NOT NULL CHECK (retail_price_mxn > 0),
  stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INT NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  design_id UUID REFERENCES mrpaps_designs (id) ON DELETE SET NULL,
  status mrpaps_product_status NOT NULL DEFAULT 'active',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, size_label, color_label)
);

CREATE INDEX IF NOT EXISTS idx_mrpaps_variants_product ON mrpaps_product_variants (product_id);
CREATE INDEX IF NOT EXISTS idx_mrpaps_variants_stock ON mrpaps_product_variants (stock_quantity) WHERE status = 'active';

-- ---------------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS mrpaps_order_number_seq START 1;

CREATE TABLE IF NOT EXISTS mrpaps_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id VARCHAR(32) NOT NULL UNIQUE,
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES mrpaps_users (id) ON DELETE SET NULL,
  status mrpaps_order_status NOT NULL DEFAULT 'pedido',
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_tax_number VARCHAR(13),
  ship_address1 TEXT NOT NULL,
  ship_address2 TEXT,
  ship_city TEXT NOT NULL,
  ship_state_code CHAR(3) NOT NULL,
  ship_country_code CHAR(2) NOT NULL DEFAULT 'MX',
  ship_zip CHAR(5) NOT NULL,
  shipping_method TEXT NOT NULL,
  shipping_label TEXT,
  subtotal_mxn DECIMAL(10, 2) NOT NULL,
  shipping_mxn DECIMAL(10, 2) NOT NULL,
  tax_mxn DECIMAL(10, 2) NOT NULL,
  total_mxn DECIMAL(10, 2) NOT NULL,
  tracking_number TEXT,
  tracking_url TEXT,
  carrier TEXT,
  internal_notes TEXT,
  ordered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  printed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mrpaps_orders_status ON mrpaps_orders (status);
CREATE INDEX IF NOT EXISTS idx_mrpaps_orders_user ON mrpaps_orders (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mrpaps_orders_email ON mrpaps_orders (customer_email);
CREATE INDEX IF NOT EXISTS idx_mrpaps_orders_ordered ON mrpaps_orders (ordered_at DESC);

CREATE TABLE IF NOT EXISTS mrpaps_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES mrpaps_orders (id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES mrpaps_product_variants (id),
  design_id UUID REFERENCES mrpaps_designs (id) ON DELETE SET NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price_mxn DECIMAL(10, 2) NOT NULL,
  product_name TEXT NOT NULL,
  variant_label TEXT NOT NULL,
  sku TEXT NOT NULL,
  thumbnail_url TEXT,
  print_file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mrpaps_order_items_order ON mrpaps_order_items (order_id);

CREATE TABLE IF NOT EXISTS mrpaps_order_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES mrpaps_orders (id) ON DELETE CASCADE,
  from_status mrpaps_order_status,
  to_status mrpaps_order_status NOT NULL,
  note TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mrpaps_order_events_order ON mrpaps_order_status_events (order_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Función: número de pedido legible
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION mrpaps_next_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  seq_val BIGINT;
  year_part TEXT;
BEGIN
  seq_val := nextval('mrpaps_order_number_seq');
  year_part := to_char(NOW() AT TIME ZONE 'America/Mexico_City', 'YYYY');
  RETURN 'MRP-' || year_part || '-' || lpad(seq_val::TEXT, 5, '0');
END;
$$;

-- ---------------------------------------------------------------------------
-- Trigger updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION mrpaps_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['mrpaps_users', 'mrpaps_addresses', 'mrpaps_designs', 'mrpaps_products', 'mrpaps_product_variants', 'mrpaps_orders']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated ON %I; CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION mrpaps_set_updated_at();',
      t, t, t, t
    );
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Datos de ejemplo (solo si no hay productos)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  p_id UUID;
  d_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM mrpaps_products LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO mrpaps_designs (name, description, file_url, thumbnail_url, tags)
  VALUES (
    'Logo Mr. Paps',
    'Diseño principal de marca',
    'https://images.pexels.com/photos/33650427/pexels-photo-33650427.jpeg',
    'https://images.pexels.com/photos/33650427/pexels-photo-33650427.jpeg',
    ARRAY['marca', 'default']
  )
  RETURNING id INTO d_id;

  INSERT INTO mrpaps_products (slug, name, description, thumbnail_url, status)
  VALUES (
    'camiseta-clasica',
    'Camiseta Clásica',
    'Algodón premium, impresión bajo demanda desde Tijuana.',
    'https://images.pexels.com/photos/5560606/pexels-photo-5560606.jpeg',
    'active'
  )
  RETURNING id INTO p_id;

  INSERT INTO mrpaps_product_variants (
    product_id, sku, size_label, color_label, retail_price_mxn, stock_quantity, design_id, sort_order
  )
  VALUES
    (p_id, 'MRP-TEE-S-BLK', 'S', 'Negro', 449.00, 25, d_id, 1),
    (p_id, 'MRP-TEE-M-BLK', 'M', 'Negro', 449.00, 40, d_id, 2),
    (p_id, 'MRP-TEE-L-BLK', 'L', 'Negro', 449.00, 35, d_id, 3),
    (p_id, 'MRP-TEE-XL-BLK', 'XL', 'Negro', 469.00, 20, d_id, 4),
    (p_id, 'MRP-TEE-M-WHT', 'M', 'Blanco', 449.00, 30, d_id, 5);
END;
$$;
