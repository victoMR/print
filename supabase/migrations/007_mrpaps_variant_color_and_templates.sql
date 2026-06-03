-- Color de prenda por variante + desactivar plantillas SVG placeholder
-- Las plantillas activas deben usar mockups PNG fotorrealistas (estilo Sudadera1).

ALTER TABLE mrpaps_product_variants
  ADD COLUMN IF NOT EXISTS garment_color_hex CHAR(7) NOT NULL DEFAULT '#FFFFFF';

-- Placeholders SVG (camiseta/gorra) no coinciden con mockups PNG — inactivos hasta subir PNG reales
UPDATE mrpaps_garment_templates
SET status = 'inactive', updated_at = NOW()
WHERE slug IN ('camiseta-clasica', 'gorra-clasica');

-- Variantes existentes heredan color del producto si aplica
UPDATE mrpaps_product_variants v
SET garment_color_hex = COALESCE(p.default_garment_color, '#FFFFFF')
FROM mrpaps_products p
WHERE v.product_id = p.id
  AND v.garment_color_hex = '#FFFFFF'
  AND p.default_garment_color IS NOT NULL
  AND p.default_garment_color <> '#FFFFFF';
