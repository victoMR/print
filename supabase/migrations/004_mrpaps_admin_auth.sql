-- Mr. Paps — autenticación admin (rol + contraseña hasheada)
-- Ejecutar después de 003_mrpaps_core.sql

DO $$ BEGIN
  CREATE TYPE mrpaps_user_role AS ENUM ('customer', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE mrpaps_users
  ADD COLUMN IF NOT EXISTS role mrpaps_user_role NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

COMMENT ON COLUMN mrpaps_users.password_hash IS 'bcrypt; solo admins y cuentas con login propio';
COMMENT ON COLUMN mrpaps_users.role IS 'customer = comprador; admin = panel /api/v1/admin';

CREATE INDEX IF NOT EXISTS idx_mrpaps_users_role ON mrpaps_users (role) WHERE role = 'admin';

-- El hash lo genera: pnpm --filter @print/api seed:admin
-- (no insertes contraseñas en texto plano aquí)
