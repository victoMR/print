-- Campos de pago Stripe en pedidos Mr. Paps.
ALTER TABLE mrpaps_orders
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

CREATE INDEX IF NOT EXISTS idx_mrpaps_orders_payment_intent
  ON mrpaps_orders (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
