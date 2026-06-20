-- Foto por color por producto.
-- Una imagen (URL) asignada a cada combinación (product_id, color_label).
-- El inventario ya existe en mrpaps_product_variants (stock_quantity por talla+color).

CREATE TABLE mrpaps_product_color_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES mrpaps_products(id) ON DELETE CASCADE,
  color_label   TEXT NOT NULL,
  image_url     TEXT NOT NULL,
  sort_order    INT  NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_product_color UNIQUE (product_id, color_label)
);

CREATE INDEX idx_product_color_images_product ON mrpaps_product_color_images(product_id);
