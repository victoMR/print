import type { ClientConfig } from 'pg';

export type PgConfigSource = 'PG*' | 'DATABASE_URL';

/** Conexión PostgreSQL: PG* (recomendado) o DATABASE_URL. */
export function getPgConfigSource(): PgConfigSource | null {
  const user = process.env.PGUSER?.trim();
  const password = process.env.PGPASSWORD;
  const host = process.env.PGHOST?.trim();
  const database = process.env.PGDATABASE?.trim();

  if (user && password !== undefined && host && database) {
    return 'PG*';
  }

  if (process.env.DATABASE_URL?.trim()) {
    return 'DATABASE_URL';
  }

  return null;
}

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
      'Falta configuración de PostgreSQL en packages/api/.env. ' +
        'Usa PGHOST, PGUSER, PGPASSWORD y PGDATABASE (recomendado) ' +
        'o DATABASE_URL.',
    );
  }

  return url;
}

/** Resumen seguro para logs (sin exponer la contraseña). */
export function describePgClientConfig(config: string | ClientConfig): string {
  const source = getPgConfigSource() ?? 'unknown';

  if (typeof config === 'string') {
    const parsed = new URL(config);
    return `source=${source} user=${parsed.username} host=${parsed.hostname} port=${parsed.port || '5432'} db=${parsed.pathname.slice(1)} passLen=${parsed.password.length}`;
  }

  return `source=${source} user=${config.user} host=${config.host} port=${config.port ?? 5432} db=${config.database} passLen=${config.password?.length ?? 0}`;
}
