import { describe, expect, it } from 'vitest';
import {
  normalizeAssetUrl,
  normalizeProductImages,
  replacePrimaryImage,
  resolveProductImages,
  resolveProductThumbnail,
} from '../lib/product-images.js';

describe('product-images', () => {
  it('resuelve galería con fallback al thumbnail', () => {
    expect(
      resolveProductImages({
        thumbnail_url: '/uploads/a.webp',
        gallery_urls: ['/uploads/b.webp', '/uploads/c.webp'],
      }),
    ).toEqual(['/uploads/b.webp', '/uploads/c.webp']);

    expect(
      resolveProductImages({
        thumbnail_url: '/uploads/a.webp',
        gallery_urls: [],
      }),
    ).toEqual(['/uploads/a.webp']);
  });

  it('normaliza galleryUrls y sincroniza portada', () => {
    expect(
      normalizeProductImages({
        galleryUrls: ['/uploads/2.webp', '/uploads/1.webp'],
      }),
    ).toEqual({
      gallery_urls: ['/uploads/2.webp', '/uploads/1.webp'],
      thumbnail_url: '/uploads/2.webp',
    });
  });

  it('reemplaza la portada manteniendo el resto', () => {
    expect(replacePrimaryImage(['/a.webp', '/b.webp', '/c.webp'], '/n.webp')).toEqual([
      '/n.webp',
      '/b.webp',
      '/c.webp',
    ]);
  });

  it('normaliza URLs absolutas del API a rutas same-origin', () => {
    expect(normalizeAssetUrl('http://localhost:4000/uploads/products/x.webp')).toBe(
      '/uploads/products/x.webp',
    );
  });

  it('usa foto por color cuando no hay galería ni thumbnail', () => {
    expect(
      resolveProductThumbnail(
        { thumbnail_url: '', gallery_urls: [] },
        [{ image_url: 'http://localhost:4000/uploads/color.webp' }],
      ),
    ).toBe('/uploads/color.webp');
  });
});
