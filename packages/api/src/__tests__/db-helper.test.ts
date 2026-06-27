import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/db.js', () => ({ pool: { query: vi.fn(), connect: vi.fn() } }));

const { buildUpdateSet } = await import('../lib/db-helper.js');

describe('buildUpdateSet', () => {
  it('serializa columnas jsonb como JSON válido con cast ::jsonb', () => {
    const { clause, values } = buildUpdateSet(
      {
        thumbnail_url: '/uploads/a.webp',
        gallery_urls: ['/uploads/a.webp', '/uploads/b.webp'],
      },
      2,
      ['gallery_urls'],
    );

    expect(clause).toBe('thumbnail_url = $2, gallery_urls = $3::jsonb');
    expect(values).toEqual([
      '/uploads/a.webp',
      '["/uploads/a.webp","/uploads/b.webp"]',
    ]);
  });
});
