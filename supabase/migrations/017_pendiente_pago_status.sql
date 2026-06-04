-- Estado previo al pago: no confundir con "Pedido recibido" (fulfillment).
-- Debe commitearse antes de usar el valor en 018.

ALTER TYPE mrpaps_order_status ADD VALUE IF NOT EXISTS 'pendiente_pago';
