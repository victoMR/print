import { query, queryOne, queryRequired, buildUpdateSet } from '../lib/db-helper.js';
import type { MrpapsDesignRow } from './mrpaps.types.js';

export async function listDesigns(): Promise<MrpapsDesignRow[]> {
  return query<MrpapsDesignRow>(`SELECT * FROM mrpaps_designs ORDER BY created_at DESC`);
}

export async function getDesignById(id: string): Promise<MrpapsDesignRow | null> {
  return queryOne<MrpapsDesignRow>(`SELECT * FROM mrpaps_designs WHERE id = $1`, [id]);
}

export async function createDesign(input: {
  name: string;
  description?: string | null;
  file_url: string;
  thumbnail_url?: string | null;
  user_id?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}): Promise<MrpapsDesignRow> {
  return queryRequired<MrpapsDesignRow>(
    `INSERT INTO mrpaps_designs (
       name, description, file_url, thumbnail_url, user_id, tags, metadata
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.name,
      input.description ?? null,
      input.file_url,
      input.thumbnail_url ?? input.file_url,
      input.user_id ?? null,
      input.tags ?? [],
      JSON.stringify(input.metadata ?? {}),
    ],
  );
}

export async function updateDesign(
  id: string,
  patch: Partial<{
    name: string;
    description: string | null;
    file_url: string;
    thumbnail_url: string | null;
    tags: string[];
  }>,
): Promise<MrpapsDesignRow> {
  const { clause, values } = buildUpdateSet({
    ...patch,
    updated_at: new Date().toISOString(),
  });
  return queryRequired<MrpapsDesignRow>(
    `UPDATE mrpaps_designs SET ${clause} WHERE id = $1 RETURNING *`,
    [id, ...values],
  );
}

export async function deleteDesign(id: string): Promise<void> {
  await query(`DELETE FROM mrpaps_designs WHERE id = $1`, [id]);
}
