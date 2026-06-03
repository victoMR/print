-- Mr. Paps — plantillas de prenda + compositor de producto
-- Ejecutar después de 004_mrpaps_admin_auth.sql

-- ---------------------------------------------------------------------------
-- Plantillas (camiseta, sudadera, gorra)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mrpaps_garment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  garment_type TEXT NOT NULL CHECK (garment_type IN ('tshirt', 'hoodie', 'cap')),
  views JSONB NOT NULL DEFAULT '[]',
  sort_order INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mrpaps_garment_templates_type
  ON mrpaps_garment_templates (garment_type)
  WHERE status = 'active';

-- ---------------------------------------------------------------------------
-- Producto: enlace a plantilla + composición del compositor
-- ---------------------------------------------------------------------------
ALTER TABLE mrpaps_products
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES mrpaps_garment_templates (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS composition JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS default_garment_color CHAR(7) NOT NULL DEFAULT '#FFFFFF';

-- ---------------------------------------------------------------------------
-- Storage bucket para diseños y previews (público lectura)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mrpaps-assets',
  'mrpaps-assets',
  true,
  20971520,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Lectura pública de assets
DO $$ BEGIN
  CREATE POLICY "Public read mrpaps assets"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'mrpaps-assets');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Seed: sudadera clásica (mockups en /public/images/plantillas/)
-- print_area: coordenadas normalizadas 0–1 sobre el mockup
-- ---------------------------------------------------------------------------
INSERT INTO mrpaps_garment_templates (slug, name, garment_type, sort_order, views)
VALUES (
  'sudadera-clasica',
  'Sudadera clásica',
  'hoodie',
  1,
  '[
    {
      "id": "front",
      "label": "Frontal",
      "mockupUrl": "/images/plantillas/sudaderas/Sudadera1/Sudadera_Blanca_Frontal.png",
      "mockupWidth": 1402,
      "mockupHeight": 1122,
      "contentBounds": { "x": 0.2953, "y": 0.1738, "width": 0.4144, "height": 0.6346 },
      "colorMaskUrl": null,
      "printArea": { "x": 0.3989, "y": 0.3642, "width": 0.2072, "height": 0.2031 },
      "printWidthIn": 12,
      "printHeightIn": 14
    },
    {
      "id": "back",
      "label": "Espalda",
      "mockupUrl": "/images/plantillas/sudaderas/Sudadera1/Sudadera_Blanca_Espalda.png",
      "mockupWidth": 1402,
      "mockupHeight": 1122,
      "contentBounds": { "x": 0.2932, "y": 0.1756, "width": 0.4123, "height": 0.6185 },
      "colorMaskUrl": null,
      "printArea": { "x": 0.3962, "y": 0.3611, "width": 0.2061, "height": 0.1979 },
      "printWidthIn": 14,
      "printHeightIn": 16
    }
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  views = EXCLUDED.views,
  updated_at = NOW();
