-- Normaliza URLs absolutas del API a rutas same-origin (/uploads/...).
-- El frontend resuelve assets vía rewrite Next → API.

UPDATE mrpaps_product_color_images
SET image_url = regexp_replace(image_url, '^https?://[^/]+', ''),
    updated_at = NOW()
WHERE image_url ~ '^https?://';

UPDATE mrpaps_products
SET thumbnail_url = regexp_replace(thumbnail_url, '^https?://[^/]+', ''),
    updated_at = NOW()
WHERE thumbnail_url ~ '^https?://';

UPDATE mrpaps_products
SET gallery_urls = (
  SELECT COALESCE(jsonb_agg(to_jsonb(regexp_replace(elem, '^https?://[^/]+', ''))), '[]'::jsonb)
  FROM jsonb_array_elements_text(gallery_urls) AS elem
),
updated_at = NOW()
WHERE gallery_urls::text ~ 'https?://';
