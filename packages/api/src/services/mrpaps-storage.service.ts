import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { BadRequestError } from '../types/errors.js';

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

const MAX_BYTES = 20 * 1024 * 1024;

/**
 * Calidad WebP por tipo de asset.
 * - thumbnails/previews: visible en la tienda → balance tamaño/calidad.
 * - designs: preview de diseño admin → más fidelidad.
 * - exports: PNG lossless → no aplica WebP.
 */
const WEBP_QUALITY: Record<AssetKind, number> = {
  thumbnails: 75,
  previews: 80,
  designs: 85,
  exports: 0, // no se usa (se guarda como PNG)
};

/**
 * `effort` controla el tiempo de CPU del codificador WebP (1 = rápido, 6 = mejor compresión).
 * 4 da ~10-15% mejor compresión que el default (4 es el nuevo default de sharp 0.33+).
 */
const WEBP_EFFORT = 4;

/** Ancho máximo en píxeles por tipo de asset. */
const MAX_WIDTH: Record<AssetKind, number | null> = {
  thumbnails: 800,
  previews: 1200,
  designs: 4096,
  exports: null,  // archivos de impresión: sin redimensionar
};

export type AssetKind = 'thumbnails' | 'previews' | 'exports' | 'designs';

/** @deprecated Usar `kind`. Se mapea en parseUploadParams. */
export type LegacyFolder = 'designs' | 'previews' | 'exports';

export type UploadParams = {
  kind: AssetKind;
  productId?: string;
  designId?: string;
  /** Borrador temporal (export prototipo sin producto). */
  stagingId?: string;
  originalName?: string;
};

export type UploadResult = {
  path: string;
  url: string;
  mime: string;
  size: number;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uploadRoot(): string {
  return process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), 'uploads');
}

function publicBaseUrl(): string | null {
  const configured = process.env.ASSETS_PUBLIC_URL?.trim();
  if (!configured || configured === 'same-origin') {
    return null;
  }
  return configured.replace(/\/$/, '');
}

/** Siempre ruta relativa — el frontend resuelve vía rewrite `/uploads` → API. */
function publicUrl(relativePath: string): string {
  return `/uploads/${relativePath}`;
}

/** URL absoluta para correos o integraciones externas cuando haga falta. */
export function absoluteAssetUrl(relativePath: string): string {
  const base = publicBaseUrl();
  if (!base) return publicUrl(relativePath);
  return `${base}/uploads/${relativePath}`;
}

function assertUuid(value: string, label: string): void {
  if (!UUID_RE.test(value)) {
    throw new BadRequestError(`${label} inválido.`);
  }
}

function assetDirectory(params: UploadParams): string {
  const { kind, productId, designId, stagingId } = params;

  if (kind === 'designs') {
    if (!designId) {
      throw new BadRequestError('designId es requerido para subir diseños.');
    }
    assertUuid(designId, 'designId');
    return `designs/${designId}`;
  }

  if (productId) {
    assertUuid(productId, 'productId');
    return `products/${productId}/${kind}`;
  }

  if (stagingId) {
    assertUuid(stagingId, 'stagingId');
    return `staging/${stagingId}/${kind}`;
  }

  throw new BadRequestError(
    'Indica productId (assets de producto) o stagingId (borrador temporal).',
  );
}

export function parseUploadParams(body: Record<string, unknown>): UploadParams {
  const kindRaw =
    (typeof body.kind === 'string' ? body.kind : undefined) ??
    (typeof body.folder === 'string' ? body.folder : undefined);

  let kind: AssetKind;
  switch (kindRaw) {
    case 'thumbnails':
      kind = 'thumbnails';
      break;
    case 'previews':
      kind = 'previews';
      break;
    case 'exports':
      kind = 'exports';
      break;
    case 'designs':
      kind = 'designs';
      break;
    default:
      kind = 'previews';
  }

  const productId = typeof body.productId === 'string' ? body.productId.trim() : undefined;
  const designId = typeof body.designId === 'string' ? body.designId.trim() : undefined;
  const stagingId = typeof body.stagingId === 'string' ? body.stagingId.trim() : undefined;

  return { kind, productId, designId, stagingId };
}

export function validateUploadFile(mime: string, size: number): void {
  if (!ALLOWED_MIME.has(mime)) {
    throw new BadRequestError(
      'Tipo de archivo no permitido. Usa PNG, JPG, WebP, HEIC o PDF.',
    );
  }
  if (size > MAX_BYTES) {
    throw new BadRequestError('El archivo supera el límite de 20 MB.');
  }
}

async function encodeAsset(
  buffer: Buffer,
  mime: string,
  kind: AssetKind,
): Promise<{ buffer: Buffer; mime: string; ext: string }> {
  // PDFs pasan sin modificación.
  if (mime === 'application/pdf') {
    return { buffer, mime, ext: 'pdf' };
  }

  // Archivos de imprenta (exports): PNG sin pérdida — WebP no es ideal para impresión.
  if (kind === 'exports') {
    const pngBuffer = await sharp(buffer, { failOn: 'truncated' })
      .rotate()                         // respeta EXIF rotation (HEIC lo usa mucho)
      .png({ compressionLevel: 6, adaptiveFiltering: true })
      .toBuffer();
    return { buffer: pngBuffer, mime: 'image/png', ext: 'png' };
  }

  // Todos los demás tipos → WebP optimizado.
  // `failOn: 'truncated'` rechaza archivos truncados pero tolera datos EXIF malformados.
  let pipeline = sharp(buffer, { failOn: 'truncated' })
    .rotate();   // aplica rotación EXIF automáticamente (crítico para fotos de iPhone/Android)

  const maxWidth = MAX_WIDTH[kind];
  if (maxWidth) {
    pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
  }

  // `effort: WEBP_EFFORT` mejora la compresión ~10-15% a costo de CPU mínimo.
  // Los metadatos (EXIF, GPS, copyright) no se propagan al WebP de salida — privacidad + peso.
  const webpBuffer = await pipeline
    .webp({ quality: WEBP_QUALITY[kind], effort: WEBP_EFFORT })
    .toBuffer();

  return { buffer: webpBuffer, mime: 'image/webp', ext: 'webp' };
}

export async function uploadAsset(
  buffer: Buffer,
  mime: string,
  params: UploadParams,
): Promise<UploadResult> {
  validateUploadFile(mime, buffer.length);

  const encoded = await encodeAsset(buffer, mime, params.kind);
  const directory = assetDirectory(params);
  const relativePath = `${directory}/${randomUUID()}.${encoded.ext}`;
  const absolutePath = path.join(uploadRoot(), relativePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, encoded.buffer);

  return {
    path: relativePath,
    url: publicUrl(relativePath),
    mime: encoded.mime,
    size: encoded.buffer.length,
  };
}

export function placeholderThumbnailUrl(): string {
  return publicUrl('_placeholders/product.webp');
}

export async function ensurePlaceholderAsset(): Promise<void> {
  const relativePath = '_placeholders/product.webp';
  const absolutePath = path.join(uploadRoot(), relativePath);

  try {
    await access(absolutePath);
    return;
  } catch {
    // Crear placeholder si no existe.
  }

  try {
    await mkdir(path.dirname(absolutePath), { recursive: true });
    const placeholder = await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 3,
        background: { r: 229, g: 231, b: 235 },
      },
    })
      .webp({ quality: 60 })
      .toBuffer();
    await writeFile(absolutePath, placeholder);
  } catch {
    // No bloquear el arranque si el disco no es escribible en dev.
  }
}

export function resolveAbsolutePath(relativePath: string): string {
  const root = uploadRoot();
  // path.resolve collapses ALL traversal sequences (including embedded ones like
  // products/uuid/../../other). Verify the result stays within the upload root.
  const abs = path.resolve(root, relativePath);
  if (!abs.startsWith(root + path.sep) && abs !== root) {
    throw new BadRequestError('Ruta de archivo inválida.');
  }
  return abs;
}

export async function deleteAsset(relativePath: string): Promise<void> {
  const absolutePath = resolveAbsolutePath(relativePath);
  await rm(absolutePath, { force: true });
}

export async function deleteDirectory(relativeDir: string): Promise<void> {
  const absoluteDir = resolveAbsolutePath(relativeDir);
  await rm(absoluteDir, { recursive: true, force: true });
}

export async function deleteProductAssets(productId: string): Promise<void> {
  assertUuid(productId, 'productId');
  await deleteDirectory(`products/${productId}`);
}

export async function deleteDesignAssets(designId: string): Promise<void> {
  assertUuid(designId, 'designId');
  await deleteDirectory(`designs/${designId}`);
}

export async function deleteStagingAssets(stagingId: string): Promise<void> {
  assertUuid(stagingId, 'stagingId');
  await deleteDirectory(`staging/${stagingId}`);
}

export function getUploadRoot(): string {
  return uploadRoot();
}
