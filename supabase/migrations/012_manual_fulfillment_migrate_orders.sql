-- Ejecutar después de 011 (enum ya commiteado).

UPDATE mrpaps_orders
SET status = 'solicitado_imprenta'
WHERE status = 'impreso';

UPDATE mrpaps_order_status_events
SET to_status = 'solicitado_imprenta'
WHERE to_status = 'impreso';

UPDATE mrpaps_order_status_events
SET from_status = 'solicitado_imprenta'
WHERE from_status = 'impreso';

ALTER TABLE mrpaps_orders
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;

UPDATE mrpaps_orders
SET requested_at = printed_at
WHERE requested_at IS NULL AND printed_at IS NOT NULL;
