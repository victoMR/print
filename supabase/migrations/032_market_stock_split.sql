-- Separa el inventario físico por mercado: MX y US ahora tienen operaciones
-- de fulfillment distintas (imprenta/almacén en México vs. proveedor en
-- EE. UU.), así que un solo contador compartido podía vender unidades que
-- solo existían físicamente en el otro país.
--
-- is_pod distingue explícitamente "inventario rastreado en cero" (agotado)
-- de "producto sin límite" (print-on-demand puro). Antes ambos casos se
-- confundían usando stock_quantity = 0 para significar "ilimitado" (ver
-- isTrackedStock en cart-limits.ts), lo cual causaba que una variante con
-- inventario rastreado que se agotaba exactamente a 0 se volviera vendible
-- sin límite otra vez.
ALTER TABLE mrpaps_product_variants
  ADD COLUMN IF NOT EXISTS is_pod BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_quantity_mx INT NOT NULL DEFAULT 0 CHECK (stock_quantity_mx >= 0),
  ADD COLUMN IF NOT EXISTS stock_quantity_us INT NOT NULL DEFAULT 0 CHECK (stock_quantity_us >= 0);

-- Todo el inventario existente se vendía exclusivamente desde México hasta
-- ahora — se traslada tal cual a stock_quantity_mx. stock_quantity_us queda
-- en 0 (agotado, no "ilimitado" — is_pod ya es false) hasta que se cargue
-- inventario real para EE. UU.
UPDATE mrpaps_product_variants SET stock_quantity_mx = stock_quantity;

DROP INDEX IF EXISTS idx_mrpaps_variants_stock;
CREATE INDEX IF NOT EXISTS idx_mrpaps_variants_stock_mx ON mrpaps_product_variants (stock_quantity_mx) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_mrpaps_variants_stock_us ON mrpaps_product_variants (stock_quantity_us) WHERE status = 'active';

ALTER TABLE mrpaps_product_variants DROP COLUMN stock_quantity;
