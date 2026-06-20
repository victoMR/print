/** Máximo de fotos por producto en catálogo. */
export const MAX_PRODUCT_GALLERY = 12;

export function parseGalleryUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((url): url is string => typeof url === 'string' && url.trim().length > 0);
}

export function resolveProductImages(product: {
  thumbnail_url: string;
  gallery_urls?: unknown;
}): string[] {
  const gallery = parseGalleryUrls(product.gallery_urls);
  if (gallery.length > 0) return gallery;
  if (product.thumbnail_url?.trim()) return [product.thumbnail_url];
  return [];
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
