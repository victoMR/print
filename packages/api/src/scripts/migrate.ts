import '../load-env.js';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, '../../../supabase/migrations');

/** Archivos con bloques Supabase Storage (no aplican en PostgreSQL puro). */
const SKIP_FILES = new Set<string>();

function stripSupabaseStorageBlocks(sql: string): string {
  return sql
    .replace(/INSERT INTO storage\.buckets[\s\S]*?ON CONFLICT \(id\) DO NOTHING;/gi, '')
    .replace(/DO \$\$ BEGIN[\s\S]*?ON storage\.objects[\s\S]*?END \$\$;/gi, '');
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

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
