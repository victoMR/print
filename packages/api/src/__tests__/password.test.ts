import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, PASSWORD_SALT_ROUNDS } from '../lib/password.js';

describe('password hashing', () => {
  it('genera un hash bcrypt con el cost configurado', async () => {
    const hash = await hashPassword('superseguro123');
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(hash).toContain(`$${PASSWORD_SALT_ROUNDS}$`);
  });

  it('verifica una contraseña correcta', async () => {
    const hash = await hashPassword('superseguro123');
    expect(await verifyPassword('superseguro123', hash)).toBe(true);
  });

  it('rechaza una contraseña incorrecta', async () => {
    const hash = await hashPassword('superseguro123');
    expect(await verifyPassword('otra', hash)).toBe(false);
  });

  it('devuelve false si el hash no es bcrypt (sin lanzar)', async () => {
    expect(await verifyPassword('x', 'no-es-bcrypt')).toBe(false);
    expect(await verifyPassword('x', '')).toBe(false);
  });

  it('produce hashes distintos para la misma contraseña (salt aleatorio)', async () => {
    const a = await hashPassword('misma');
    const b = await hashPassword('misma');
    expect(a).not.toBe(b);
  });
});
