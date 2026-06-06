import { describe, it, expect } from 'vitest';
import {
  generateTrackingCode,
  normalizeTrackingCode,
  parseGuestTrackingInput,
  formatTrackingCodeDisplay,
  TRACKING_CODE_PATTERN,
} from '../lib/order-tracking-code.js';

describe('generateTrackingCode', () => {
  it('genera códigos con el formato MRP-XXXX-XXXX-XXXX', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateTrackingCode()).toMatch(TRACKING_CODE_PATTERN);
    }
  });

  it('no usa caracteres ambiguos (0,O,1,I,L)', () => {
    for (let i = 0; i < 50; i++) {
      const body = generateTrackingCode().replace(/^MRP-/, '');
      expect(body).not.toMatch(/[01OIL]/);
    }
  });

  it('produce códigos razonablemente únicos', () => {
    const set = new Set(Array.from({ length: 500 }, () => generateTrackingCode()));
    expect(set.size).toBe(500);
  });
});

describe('normalizeTrackingCode', () => {
  it('acepta código canónico y lo deja igual (mayúsculas)', () => {
    expect(normalizeTrackingCode('MRP-K7NH-9P2W-X7M8')).toBe('MRP-K7NH-9P2W-X7M8');
  });

  it('normaliza minúsculas y espacios sobrantes', () => {
    expect(normalizeTrackingCode('  mrp-k7nh-9p2w-x7m8  ')).toBe('MRP-K7NH-9P2W-X7M8');
  });

  it('reconstruye guiones cuando el usuario pega el código compacto', () => {
    expect(normalizeTrackingCode('MRPK7NH9P2WX7M8')).toBe('MRP-K7NH-9P2W-X7M8');
  });

  it('acepta códigos legacy de 32 hex', () => {
    const legacy = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
    expect(normalizeTrackingCode(legacy)).toBe(legacy);
  });

  it('rechaza cadenas vacías o inválidas', () => {
    expect(normalizeTrackingCode('')).toBeNull();
    expect(normalizeTrackingCode('   ')).toBeNull();
    expect(normalizeTrackingCode('hola-mundo')).toBeNull();
    // contiene carácter ambiguo (O,1) fuera del alfabeto
    expect(normalizeTrackingCode('MRP-O1IL-9P2W-X7M8')).toBeNull();
  });
});

describe('parseGuestTrackingInput', () => {
  it('clasifica un public_id', () => {
    expect(parseGuestTrackingInput('mrp-k7nh-9p2w-x7m8')).toEqual({
      kind: 'public_id',
      value: 'MRP-K7NH-9P2W-X7M8',
    });
  });

  it('clasifica un número interno MRP-2026-00001', () => {
    expect(parseGuestTrackingInput('mrp-2026-00001')).toEqual({
      kind: 'order_number',
      value: 'MRP-2026-00001',
    });
  });

  it('devuelve null para entradas no reconocibles', () => {
    expect(parseGuestTrackingInput('basura')).toBeNull();
  });
});

describe('formatTrackingCodeDisplay', () => {
  it('deja el código canónico en mayúsculas', () => {
    expect(formatTrackingCodeDisplay('mrp-k7nh-9p2w-x7m8')).toBe('MRP-K7NH-9P2W-X7M8');
  });

  it('formatea códigos legacy hex en bloques', () => {
    const legacy = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
    expect(formatTrackingCodeDisplay(legacy)).toBe('A1B2C3D4-E5F60718-293A4B5C-6D7E8F90');
  });
});
