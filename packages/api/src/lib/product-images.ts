/** Máximo de fotos por producto en catálogo. */
export const MAX_PRODUCT_GALLERY = 12;

const PLACEHOLDER_PATH = '/uploads/_placeholders/';

/** Convierte URLs absolutas del API (`http://host/uploads/...`) a ruta same-origin. */
export function normalizeAssetUrl(url: string | null | undefined): string {
  if (!url?.trim()) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('/uploads/')) return trimmed;

  try {
    const { pathname } = new URL(trimmed);
    if (pathname.startsWith('/uploads/')) return pathname;
  } catch {
    // no es URL absoluta
  }

  return trimmed;
}

export function isPlaceholderAssetUrl(url: string | null | undefined): boolean {
  const normalized = normalizeAssetUrl(url);
  return normalized.includes(PLACEHOLDER_PATH);
}

export function parseGalleryUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
    .map((url) => normalizeAssetUrl(url))
    .filter((url) => url.length > 0 && !isPlaceholderAssetUrl(url));
}

export function resolveProductImages(
  product: { thumbnail_url: string; gallery_urls?: unknown },
  colorImageRows?: Array<{ image_url: string }>,
): string[] {
  const gallery = parseGalleryUrls(product.gallery_urls);
  if (gallery.length > 0) return gallery;

  const thumb = normalizeAssetUrl(product.thumbnail_url);
  if (thumb && !isPlaceholderAssetUrl(thumb)) return [thumb];

  const fromColor = (colorImageRows ?? [])
    .map((row) => normalizeAssetUrl(row.image_url))
    .filter(Boolean);
  if (fromColor.length > 0) return fromColor;

  if (thumb) return [thumb];
  return [];
}

/** Portada pública: fotos por color → galería real → thumbnail legacy → placeholder. */
export function resolveProductThumbnail(
  product: { thumbnail_url: string; gallery_urls?: unknown },
  colorImageRows?: Array<{ image_url: string }>,
): string {
  return resolveProductImages(product, colorImageRows)[0] ?? '';
}

/** Sincroniza thumbnail con la primera foto de la galería. */
export function normalizeProductImages(input: {
  thumbnailUrl?: string;
  galleryUrls?: string[];
}): { gallery_urls: string[]; thumbnail_url: string | undefined } {
  if (input.galleryUrls !== undefined) {
    const gallery = input.galleryUrls.slice(0, MAX_PRODUCT_GALLERY);
    return {
      gallery_urls: gallery,
      thumbnail_url: gallery[0] ?? input.thumbnailUrl,
    };
  }

  if (input.thumbnailUrl) {
    return {
      gallery_urls: [input.thumbnailUrl],
      thumbnail_url: input.thumbnailUrl,
    };
  }

  return { gallery_urls: [], thumbnail_url: undefined };
}

/** Reemplaza la portada manteniendo el resto de la galería. */
export function replacePrimaryImage(
  currentGallery: string[],
  newPrimaryUrl: string,
): string[] {
  if (currentGallery.length === 0) return [newPrimaryUrl];
  return [newPrimaryUrl, ...currentGallery.slice(1)];
}
