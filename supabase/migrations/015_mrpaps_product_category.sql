-- Categoría de catálogo (shop / filtros / admin)

ALTER TABLE mrpaps_products
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'camiseta';

ALTER TABLE mrpaps_products
  DROP CONSTRAINT IF EXISTS mrpaps_products_category_check;

ALTER TABLE mrpaps_products
  ADD CONSTRAINT mrpaps_products_category_check
  CHECK (category IN ('camiseta', 'sudadera', 'gorra', 'tenis'));

CREATE INDEX IF NOT EXISTS idx_mrpaps_products_category
  ON mrpaps_products (category)
  WHERE status = 'active';
