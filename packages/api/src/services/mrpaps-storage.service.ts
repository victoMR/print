import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { BadRequestError } from '../types/errors.js';

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

function uploadRoot(): string {
  return process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), 'uploads');
}

function publicBaseUrl(): string {
  const base = process.env.ASSETS_PUBLIC_URL ?? process.env.APP_URL ?? 'http://127.0.0.1:4000';
  return base.replace(/\/$/, '');
}

function publicUrl(relativePath: string): string {
  return `${publicBaseUrl()}/uploads/${relativePath}`;
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
  const relativePath = `${folder}/${randomUUID()}.${ext}`;
  const absolutePath = path.join(uploadRoot(), relativePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);

  return {
    path: relativePath,
    url: publicUrl(relativePath),
    mime,
    size: buffer.length,
  };
}

export function getUploadRoot(): string {
  return uploadRoot();
}
