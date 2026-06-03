-- Migración: Cuentas de clientes
-- Agrega password_hash y role a mrpaps_users para autenticación nativa por JWT.

ALTER TABLE mrpaps_users
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer', 'admin'));

-- Índice para búsqueda rápida por email en login
CREATE INDEX IF NOT EXISTS idx_mrpaps_users_email ON mrpaps_users (email);

-- La columna is_default en mrpaps_addresses si no existe
ALTER TABLE mrpaps_addresses
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- El campo ordered_at en mrpaps_orders (alias de created_at) si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mrpaps_orders' AND column_name = 'ordered_at'
  ) THEN
    ALTER TABLE mrpaps_orders ADD COLUMN ordered_at TIMESTAMPTZ;
    UPDATE mrpaps_orders SET ordered_at = created_at WHERE ordered_at IS NULL;
    ALTER TABLE mrpaps_orders ALTER COLUMN ordered_at SET DEFAULT NOW();
  END IF;
END $$;
