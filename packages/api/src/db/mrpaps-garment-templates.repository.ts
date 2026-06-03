import { query, queryOne } from '../lib/db-helper.js';
import type { MrpapsGarmentTemplateRow } from './mrpaps.types.js';

export async function listActiveTemplates(): Promise<MrpapsGarmentTemplateRow[]> {
  return query<MrpapsGarmentTemplateRow>(
    `SELECT * FROM mrpaps_garment_templates WHERE status = 'active' ORDER BY sort_order`,
  );
}

export async function getTemplateById(id: string): Promise<MrpapsGarmentTemplateRow | null> {
  return queryOne<MrpapsGarmentTemplateRow>(
    `SELECT * FROM mrpaps_garment_templates WHERE id = $1`,
    [id],
  );
}

export async function getTemplateBySlug(slug: string): Promise<MrpapsGarmentTemplateRow | null> {
  return queryOne<MrpapsGarmentTemplateRow>(
    `SELECT * FROM mrpaps_garment_templates WHERE slug = $1`,
    [slug],
  );
}
