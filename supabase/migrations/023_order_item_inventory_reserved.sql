-- Unidades descontadas de inventario rastreado al confirmar pago (Stripe succeeded).
-- Se devuelven si el pedido se cancela antes de pagar.
ALTER TABLE mrpaps_order_items
  ADD COLUMN IF NOT EXISTS inventory_reserved_qty INT NOT NULL DEFAULT 0;
