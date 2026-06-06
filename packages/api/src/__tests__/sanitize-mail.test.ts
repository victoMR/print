import { describe, it, expect } from 'vitest';
import { sanitizeMailHeaderValue } from '../lib/sanitize-mail.js';

describe('sanitizeMailHeaderValue', () => {
  it('deja intacto un nombre normal', () => {
    expect(sanitizeMailHeaderValue('Juan Pérez')).toBe('Juan Pérez');
  });

  it('elimina CR/LF para prevenir inyección de cabeceras', () => {
    const malicioso = 'Víctima\r\nBcc: atacante@evil.com';
    const limpio = sanitizeMailHeaderValue(malicioso);
    expect(limpio).not.toMatch(/[\r\n]/);
    // \r\n → dos espacios (se reemplaza cada carácter de control)
    expect(limpio).toBe('Víctima  Bcc: atacante@evil.com');
  });

  it('elimina solo LF', () => {
    expect(sanitizeMailHeaderValue('línea1\nlínea2')).toBe('línea1 línea2');
  });

  it('elimina bytes nulos', () => {
    expect(sanitizeMailHeaderValue('abc\u0000def')).toBe('abc def');
  });

  it('recorta espacios al inicio y final', () => {
    expect(sanitizeMailHeaderValue('  hola  ')).toBe('hola');
  });

  it('neutraliza un Subject con salto de línea + inyección Content-Type', () => {
    const subject = 'Pedido\r\nContent-Type: text/html';
    const limpio = sanitizeMailHeaderValue(subject);
    expect(limpio).not.toMatch(/[\r\n]/);
    expect(limpio).toBe('Pedido  Content-Type: text/html');
  });
});
