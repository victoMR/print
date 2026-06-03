import type { ClientConfig } from 'pg';

/** Conexión PostgreSQL: PG* (recomendado) o DATABASE_URL. */
export function getPgClientConfig(): string | ClientConfig {
  const user = process.env.PGUSER?.trim();
  const password = process.env.PGPASSWORD;
  const host = process.env.PGHOST?.trim();
  const database = process.env.PGDATABASE?.trim();

  if (user && password !== undefined && host && database) {
    return {
      host,
      port: Number(process.env.PGPORT ?? 5432),
      user,
      password,
      database,
    };
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      'Falta configuración de PostgreSQL. Usa PGHOST, PGUSER, PGPASSWORD y PGDATABASE ' +
        'en packages/api/.env (recomendado si la contraseña tiene # $ @ *) ' +
        'o DATABASE_URL con la contraseña codificada en URL.',
    );
  }

  return url;
}

/** Resumen seguro para logs (sin exponer la contraseña). */
export function describePgClientConfig(config: string | ClientConfig): string {
  if (typeof config === 'string') {
    const parsed = new URL(config);
    return `user=${parsed.username} host=${parsed.hostname} port=${parsed.port || '5432'} db=${parsed.pathname.slice(1)} passLen=${parsed.password.length}`;
  }

  return `user=${config.user} host=${config.host} port=${config.port ?? 5432} db=${config.database} passLen=${config.password?.length ?? 0}`;
}
