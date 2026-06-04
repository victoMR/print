-- Registro de correo de confirmación enviado (evita duplicados en reintentos de webhook).
ALTER TABLE mrpaps_orders
  ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ;
