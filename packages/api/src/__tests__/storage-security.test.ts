import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import {
  validateUploadFile,
  parseUploadParams,
  resolveAbsolutePath,
} from '../services/mrpaps-storage.service.js';

const _origUploadDir = process.env.UPLOAD_DIR;
const ROOT = '/var/test-uploads';

beforeAll(() => {
  process.env.UPLOAD_DIR = ROOT;
});
afterAll(() => {
  if (_origUploadDir === undefined) delete process.env.UPLOAD_DIR;
  else process.env.UPLOAD_DIR = _origUploadDir;
});

// ── Allowlist de MIME (incluye bloqueo de SVG: fix XSS almacenado) ─────────────
describe('validateUploadFile — allowlist de tipos', () => {
  it.each(['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])(
    'acepta %s',
    (mime: string) => {
      expect(() => validateUploadFile(mime, 1024)).not.toThrow();
    },
  );

  it('RECHAZA image/svg+xml (vector de XSS almacenado)', () => {
    expect(() => validateUploadFile('image/svg+xml', 1024)).toThrow('no permitido');
  });

  it('rechaza HEIC con mensaje específico de conversión', () => {
    expect(() => validateUploadFile('image/heic', 1024)).toThrow('HEIC no soportado');
    expect(() => validateUploadFile('image/heif', 1024)).toThrow('HEIC no soportado');
  });

  it('rechaza tipos arbitrarios', () => {
    expect(() => validateUploadFile('application/x-msdownload', 1024)).toThrow('no permitido');
    expect(() => validateUploadFile('text/html', 1024)).toThrow('no permitido');
  });

  it('rechaza archivos por encima de 20 MB', () => {
    const tooBig = 20 * 1024 * 1024 + 1;
    expect(() => validateUploadFile('image/png', tooBig)).toThrow('20 MB');
  });

  it('acepta justo en el límite de 20 MB', () => {
    expect(() => validateUploadFile('image/png', 20 * 1024 * 1024)).not.toThrow();
  });
});

// ── parseUploadParams ───────────────────────────────────────────────────────────
describe('parseUploadParams', () => {
  it('mapea kind directamente', () => {
    expect(parseUploadParams({ kind: 'thumbnails' })).toMatchObject({ kind: 'thumbnails' });
    expect(parseUploadParams({ kind: 'designs', designId: 'd1' })).toMatchObject({
      kind: 'designs',
      designId: 'd1',
    });
  });

  it('cae a "previews" con kind desconocido o ausente', () => {
    expect(parseUploadParams({}).kind).toBe('previews');
    expect(parseUploadParams({ kind: 'inventado' }).kind).toBe('previews');
  });

  it('acepta alias legacy "folder"', () => {
    expect(parseUploadParams({ folder: 'exports' }).kind).toBe('exports');
  });

  it('recorta ids', () => {
    expect(parseUploadParams({ kind: 'thumbnails', productId: '  p1  ' }).productId).toBe('p1');
  });
});

// ── Path traversal (fix #7) ───────────────────────────────────────────────────
describe('resolveAbsolutePath — protección contra path traversal', () => {
  it('resuelve una ruta normal dentro del root', () => {
    const abs = resolveAbsolutePath('products/uuid/thumbnails/file.webp');
    expect(abs).toBe(path.join(ROOT, 'products/uuid/thumbnails/file.webp'));
    expect(abs.startsWith(ROOT)).toBe(true);
  });

  it('lanza con ../ que escapa del root', () => {
    expect(() => resolveAbsolutePath('../../etc/passwd')).toThrow('inválida');
  });

  it('lanza con traversal embebido que sube por encima del root', () => {
    expect(() => resolveAbsolutePath('products/../../../secret.txt')).toThrow('inválida');
  });

  it('lanza con una ruta absoluta inyectada', () => {
    expect(() => resolveAbsolutePath('/etc/passwd')).toThrow('inválida');
  });

  it('permite el propio root', () => {
    expect(() => resolveAbsolutePath('.')).not.toThrow();
  });
});
