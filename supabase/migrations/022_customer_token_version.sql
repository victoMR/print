-- Invalida JWTs de cliente al cerrar sesión o cambiar contraseña.
ALTER TABLE mrpaps_users
  ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0;
