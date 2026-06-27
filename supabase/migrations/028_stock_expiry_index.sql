-- Index para la limpieza eficiente de reservas de stock expiradas.
-- Filtra órdenes pendiente_pago por ordered_at sin escanear toda la tabla.
CREATE INDEX IF NOT EXISTS idx_mrpaps_orders_pending_expiry
  ON mrpaps_orders (ordered_at)
  WHERE status = 'pendiente_pago';
