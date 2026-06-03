import { randomUUID } from 'node:crypto';
import { supabase } from '../lib/supabase.js';
import { BadRequestError } from '../types/errors.js';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'mrpaps-assets';

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
]);

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
};

const MAX_BYTES = 20 * 1024 * 1024;

export type UploadResult = {
  path: string;
  url: string;
  mime: string;
  size: number;
};

function publicUrl(path: string): string {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
  if (!base) throw new Error('SUPABASE_URL is required');
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

export function validateUploadFile(mime: string, size: number): void {
  if (mime === 'image/heic' || mime === 'image/heif') {
    throw new BadRequestError(
      'HEIC no soportado. Convierte el archivo a PNG o JPG antes de subir.',
    );
  }
  if (!ALLOWED_MIME.has(mime)) {
    throw new BadRequestError(
      'Tipo de archivo no permitido. Usa PNG, JPG, WebP, SVG o PDF.',
    );
  }
  if (size > MAX_BYTES) {
    throw new BadRequestError('El archivo supera el límite de 20 MB.');
  }
}

export async function uploadAsset(
  buffer: Buffer,
  mime: string,
  folder: 'designs' | 'previews' | 'exports',
  originalName?: string,
): Promise<UploadResult> {
  validateUploadFile(mime, buffer.length);

  const extFromName = originalName?.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase();
  const ext = extFromName && extFromName.length <= 5 ? extFromName : (EXT_BY_MIME[mime] ?? 'bin');
  const path = `${folder}/${randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: mime,
    upsert: false,
  });

  if (error) {
    throw new BadRequestError(`Error al subir archivo: ${error.message}`);
  }

  return {
    path,
    url: publicUrl(path),
    mime,
    size: buffer.length,
  };
}
