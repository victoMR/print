-- Campos de traducción al inglés para productos. Nullable: se llenan de forma
-- automática (traducción vía API) al crear/editar un producto en el admin; el
-- flag *_is_manual evita que una corrección manual se sobreescriba después.
ALTER TABLE mrpaps_products
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS name_en_is_manual BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS description_en_is_manual BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS translated_at TIMESTAMPTZ;
