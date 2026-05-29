/**
 * Crea o actualiza un usuario admin con contraseña hasheada (bcrypt).
 *
 * Uso:
 *   ADMIN_SEED_EMAIL=admin@mrpaps.mx ADMIN_SEED_PASSWORD='TuClaveSegura' pnpm seed:admin
 */
import '../load-env.js';
import { hashPassword } from '../services/admin-auth.service.js';
import * as usersRepo from '../db/mrpaps-users.repository.js';

async function main(): Promise<void> {
  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;
  const name = process.env.ADMIN_SEED_NAME ?? 'Administrador';

  if (!email || !password) {
    console.error('Define ADMIN_SEED_EMAIL y ADMIN_SEED_PASSWORD (mín. 8 caracteres).');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('ADMIN_SEED_PASSWORD debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  const password_hash = await hashPassword(password);
  const user = await usersRepo.upsertAdminUser({
    email,
    full_name: name,
    password_hash,
  });

  console.log(`Admin listo: ${user.email} (id: ${user.id})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
