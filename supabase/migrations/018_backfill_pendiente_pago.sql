-- Pedidos creados en checkout pero sin pago confirmado.

UPDATE mrpaps_orders
SET status = 'pendiente_pago'
WHERE status = 'pedido'
  AND COALESCE(payment_status, 'pending') IN ('pending', 'failed');
