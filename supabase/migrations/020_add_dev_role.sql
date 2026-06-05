-- Migración: agregar rol 'dev' (superadmin)
-- La columna role es de tipo enum mrpaps_user_role (creado en 004).
-- ADD VALUE IF NOT EXISTS es seguro y no requiere DROP/RECREATE del enum.

ALTER TYPE mrpaps_user_role ADD VALUE IF NOT EXISTS 'dev';

-- Índice para búsqueda por rol privilegiado (acceso al panel)
CREATE INDEX IF NOT EXISTS idx_mrpaps_users_privileged
  ON mrpaps_users (role)
  WHERE role IN ('admin', 'dev');
