-- Galería de fotos por producto (ordenada)
ALTER TABLE mrpaps_products
  ADD COLUMN IF NOT EXISTS gallery_urls JSONB NOT NULL DEFAULT '[]';

-- Backfill: productos existentes con thumbnail → galería de una foto
UPDATE mrpaps_products
SET gallery_urls = jsonb_build_array(thumbnail_url)
WHERE thumbnail_url IS NOT NULL
  AND thumbnail_url <> ''
  AND gallery_urls = '[]'::jsonb;
