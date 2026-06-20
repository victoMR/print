import { describe, expect, it } from 'vitest';
import {
  normalizeProductImages,
  replacePrimaryImage,
  resolveProductImages,
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
});
