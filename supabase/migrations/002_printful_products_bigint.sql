-- Migrate Printful IDs to BIGINT to avoid 32-bit overflow.
-- This is required because Printful IDs can be > 2,147,483,647.

ALTER TABLE printful_products
  ALTER COLUMN printful_sync_product_id TYPE BIGINT,
  ALTER COLUMN printful_sync_variant_id TYPE BIGINT,
  ALTER COLUMN printful_catalog_variant_id TYPE BIGINT;

