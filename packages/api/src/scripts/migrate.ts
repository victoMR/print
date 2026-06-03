import '../load-env.js';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { describePgClientConfig, getPgClientConfig } from '../lib/database-config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '../..');
const monorepoRoot = path.resolve(packageRoot, '../..');
const migrationsDir = path.join(monorepoRoot, 'supabase/migrations');

/** Archivos con bloques Supabase Storage (no aplican en PostgreSQL puro). */
const SKIP_FILES = new Set<string>();

function stripSupabaseStorageBlocks(sql: string): string {
  return sql
    .replace(/INSERT INTO storage\.buckets[\s\S]*?ON CONFLICT \(id\) DO NOTHING;/gi, '')
    .replace(/DO \$\$ BEGIN[\s\S]*?ON storage\.objects[\s\S]*?END \$\$;/gi, '');
}

async function main(): Promise<void> {
  const pgConfig = getPgClientConfig();
  console.log(`Conectando: ${describePgClientConfig(pgConfig)}`);

  const client = new pg.Client(pgConfig);
  try {
    await client.connect();
  } catch (err) {
    const pgErr = err as { code?: string };
    if (pgErr.code === '28P01') {
      console.error(
        '\nAutenticación fallida. Si la contraseña tiene # $ @ *, usa variables PG* en packages/api/.env:\n' +
          '  PGHOST=127.0.0.1\n' +
          '  PGPORT=5432\n' +
          '  PGUSER=mrpaps\n' +
          '  PGPASSWORD=contraseña_en_texto_plano\n' +
          '  PGDATABASE=mrpaps\n',
      );
    }
    throw err;
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const files = (await readdir(migrationsDir))
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const filename of files) {
    if (SKIP_FILES.has(filename)) {
      console.log(`skip ${filename}`);
      continue;
    }

    const { rows } = await client.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations WHERE filename = $1',
      [filename],
    );
    if (rows.length > 0) {
      console.log(`skip ${filename}`);
      continue;
    }

    let raw = await readFile(path.join(migrationsDir, filename), 'utf8');
    raw = stripSupabaseStorageBlocks(raw);

    console.log(`apply ${filename}`);
    await client.query('BEGIN');
    try {
      await client.query(raw);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  await client.end();
  console.log('Migraciones completadas.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
