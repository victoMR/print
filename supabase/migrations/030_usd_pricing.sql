-- Soporte de precio/cobro en USD en paralelo a MXN (mismo patrón que
-- printful_products, que ya combina retail_price_mxn + printful_cost_usd).
--
-- retail_price_usd es nullable: un producto puede no tener precio en USD
-- todavía, en cuyo caso se oculta de catálogo/checkout en USD (ver
-- mrpaps-catalog.service.ts) en vez de mostrar $0 o bloquear el carrito completo.
ALTER TABLE mrpaps_product_variants
  ADD COLUMN IF NOT EXISTS retail_price_usd DECIMAL(10, 2)
    CHECK (retail_price_usd IS NULL OR retail_price_usd > 0);

-- currency es la moneda real en la que se cobró la orden (no nullable: toda
-- orden se cobra en una sola moneda). subtotal_mxn/shipping_mxn/tax_mxn/total_mxn
-- dejan de ser NOT NULL: para una orden en USD esos importes en pesos
-- simplemente no existen como tal (el precio en USD no se deriva del de MXN)
-- hasta que Stripe liquida el pago — ver stripe_settlement_amount_mxn abajo,
-- que es el dato real de contabilidad/CFDI, no una conversión propia.
ALTER TABLE mrpaps_orders
  ADD COLUMN IF NOT EXISTS currency CHAR(3) NOT NULL DEFAULT 'MXN'
    CHECK (currency IN ('MXN', 'USD')),
  ALTER COLUMN subtotal_mxn DROP NOT NULL,
  ALTER COLUMN shipping_mxn DROP NOT NULL,
  ALTER COLUMN tax_mxn DROP NOT NULL,
  ALTER COLUMN total_mxn DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS subtotal_usd DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS shipping_usd DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS tax_usd DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS total_usd DECIMAL(10, 2),
  -- Monto real liquidado en MXN y tipo de cambio aplicado por Stripe, tomados
  -- de la balance transaction del cargo tras payment_intent.succeeded — nunca
  -- estimados con un tipo de cambio propio (ver mrpaps-payment.service.ts).
  ADD COLUMN IF NOT EXISTS stripe_settlement_amount_mxn DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS stripe_fx_rate DECIMAL(12, 6);

ALTER TABLE mrpaps_order_items
  ADD COLUMN IF NOT EXISTS unit_price_usd DECIMAL(10, 2);
