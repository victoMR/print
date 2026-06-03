-- Fulfillment manual: nuevos estados (deben commitearse antes de usarlos en 012).
-- PostgreSQL: no mezclar ADD VALUE con UPDATE en la misma transacción.

ALTER TYPE mrpaps_order_status ADD VALUE IF NOT EXISTS 'solicitado_imprenta';
ALTER TYPE mrpaps_order_status ADD VALUE IF NOT EXISTS 'recibido_imprenta';
