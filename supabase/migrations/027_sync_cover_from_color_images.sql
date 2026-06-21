-- Sincroniza thumbnail/galería con la primera foto por color cuando solo hay placeholder.

UPDATE mrpaps_products p
SET
  thumbnail_url = ci.image_url,
  gallery_urls = jsonb_build_array(ci.image_url),
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (product_id)
    product_id,
    image_url
  FROM mrpaps_product_color_images
  ORDER BY product_id, sort_order, created_at
) ci
WHERE p.id = ci.product_id
  AND (
    p.thumbnail_url LIKE '%/_placeholders/%'
    OR p.gallery_urls::text LIKE '%/_placeholders/%'
  );
