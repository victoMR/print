-- Unidades descontadas de inventario rastreado al crear el pedido (pendiente_pago).
-- Se devuelven si el pedido se cancela antes de pagar.
ALTER TABLE mrpaps_order_items
  ADD COLUMN IF NOT EXISTS inventory_reserved_qty INT NOT NULL DEFAULT 0;
