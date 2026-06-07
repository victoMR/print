import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

// ── Mock external deps so tests run sin DB ni SMTP ────────────────────────────
vi.mock('../db/mrpaps-users.repository.js', () => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  createCustomerForRegistration: vi.fn(),
}));
vi.mock('../lib/password.js', () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));
vi.mock('../services/email-verification.service.js', () => ({
  sendEmailVerification: vi.fn(),
  LEGAL_VERSION: '2026-01-01',
}));

import * as usersRepo from '../db/mrpaps-users.repository.js';
import * as passwordLib from '../lib/password.js';
import * as emailVerification from '../services/email-verification.service.js';

// JWT secret debe existir antes de importar el servicio (se lee en runtime, pero
// lo fijamos arriba para consistencia con el resto de la suite).
const _originalSecret = process.env.CUSTOMER_JWT_SECRET;
process.env.CUSTOMER_JWT_SECRET = 'customer-test-secret-at-least-32-characters!!';

const {
  registerCustomer,
  loginCustomer,
  signCustomerToken,
  verifyCustomerToken,
  resolveCustomerSession,
  refreshCustomerSession,
  publicCustomer,
} = await import('../services/customer-auth.service.js');

import { decodeJwt } from 'jose';

afterAll(() => {
  if (_originalSecret === undefined) delete process.env.CUSTOMER_JWT_SECRET;
  else process.env.CUSTOMER_JWT_SECRET = _originalSecret;
});

function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'user-uuid-1',
    auth_user_id: null,
    email: 'cliente@example.com',
    full_name: 'Cliente Prueba',
    phone: '5512345678',
    tax_number: null,
    role: 'customer' as const,
    password_hash: '$2b$12$hashhashhashhashhashhash',
    email_verified_at: '2026-01-02T00:00:00Z',
    email_verification_token_hash: null,
    email_verification_expires_at: null,
    terms_accepted_at: '2026-01-01T00:00:00Z',
    terms_accepted_version: '2026-01-01',
    privacy_accepted_at: '2026-01-01T00:00:00Z',
    privacy_accepted_version: '2026-01-01',
    token_version: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Registro ──────────────────────────────────────────────────────────────────
describe('registerCustomer', () => {
  const baseInput = {
    email: 'Nuevo@Example.com',
    password: 'password123',
    fullName: 'Nuevo Cliente',
    acceptedTerms: true as const,
    acceptedPrivacy: true as const,
  };

  it('rechaza contraseñas de menos de 8 caracteres', async () => {
    await expect(registerCustomer({ ...baseInput, password: 'corta' })).rejects.toThrow(
      'al menos 8 caracteres',
    );
    expect(usersRepo.findUserByEmail).not.toHaveBeenCalled();
  });

  it('rechaza si ya existe una cuenta con contraseña', async () => {
    vi.mocked(usersRepo.findUserByEmail).mockResolvedValue(makeUser());
    await expect(registerCustomer(baseInput)).rejects.toThrow('Ya existe una cuenta');
  });

  it('normaliza el email a minúsculas y dispara verificación', async () => {
    vi.mocked(usersRepo.findUserByEmail).mockResolvedValue(null);
    vi.mocked(passwordLib.hashPassword).mockResolvedValue('$2b$12$hashed');
    vi.mocked(usersRepo.createCustomerForRegistration).mockResolvedValue(
      makeUser({ email: 'nuevo@example.com', email_verified_at: null }),
    );

    const result = await registerCustomer(baseInput);

    expect(usersRepo.findUserByEmail).toHaveBeenCalledWith('nuevo@example.com');
    expect(usersRepo.createCustomerForRegistration).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'nuevo@example.com', legal_version: emailVerification.LEGAL_VERSION }),
    );
    expect(emailVerification.sendEmailVerification).toHaveBeenCalledOnce();
    expect(result).toEqual({ requiresEmailVerification: true, email: 'nuevo@example.com' });
  });

  it('traduce EMAIL_ALREADY_REGISTERED del repo a error de negocio', async () => {
    vi.mocked(usersRepo.findUserByEmail).mockResolvedValue(null);
    vi.mocked(passwordLib.hashPassword).mockResolvedValue('$2b$12$hashed');
    vi.mocked(usersRepo.createCustomerForRegistration).mockRejectedValue(
      new Error('EMAIL_ALREADY_REGISTERED'),
    );

    await expect(registerCustomer(baseInput)).rejects.toThrow('Ya existe una cuenta');
    expect(emailVerification.sendEmailVerification).not.toHaveBeenCalled();
  });
});

// ── Login (carga de usuario + verificación) ────────────────────────────────────
describe('loginCustomer', () => {
  it('rechaza credenciales cuando el usuario no existe', async () => {
    vi.mocked(usersRepo.findUserByEmail).mockResolvedValue(null);
    await expect(loginCustomer('x@y.com', 'pass')).rejects.toThrow('incorrectos');
  });

  it('rechaza si el rol no es customer', async () => {
    vi.mocked(usersRepo.findUserByEmail).mockResolvedValue(makeUser({ role: 'admin' }));
    await expect(loginCustomer('x@y.com', 'pass')).rejects.toThrow('incorrectos');
  });

  it('rechaza con contraseña inválida', async () => {
    vi.mocked(usersRepo.findUserByEmail).mockResolvedValue(makeUser());
    vi.mocked(passwordLib.verifyPassword).mockResolvedValue(false);
    await expect(loginCustomer('cliente@example.com', 'mala')).rejects.toThrow('incorrectos');
  });

  it('rechaza si el correo no está verificado', async () => {
    vi.mocked(usersRepo.findUserByEmail).mockResolvedValue(makeUser({ email_verified_at: null }));
    vi.mocked(passwordLib.verifyPassword).mockResolvedValue(true);
    await expect(loginCustomer('cliente@example.com', 'password123')).rejects.toThrow(
      'Confirma tu correo',
    );
  });

  it('devuelve token y usuario público en login válido', async () => {
    vi.mocked(usersRepo.findUserByEmail).mockResolvedValue(makeUser());
    vi.mocked(passwordLib.verifyPassword).mockResolvedValue(true);

    const result = await loginCustomer('Cliente@Example.com', 'password123');

    expect(usersRepo.findUserByEmail).toHaveBeenCalledWith('cliente@example.com');
    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe('cliente@example.com');
    expect(result.user).not.toHaveProperty('password_hash');
  });
});

// ── Tokens JWT ──────────────────────────────────────────────────────────────────
describe('JWT de cliente', () => {
  it('firma y verifica un token con token_version embebido', async () => {
    const token = await signCustomerToken({
      id: 'abc',
      email: 'a@b.com',
      role: 'customer',
      token_version: 3,
    });
    const payload = await verifyCustomerToken(token);
    expect(payload.sub).toBe('abc');
    expect(payload.email).toBe('a@b.com');
    expect(payload.tv).toBe(3);
    expect(payload.rm).toBe(true);
  });

  it('usa TTL corto cuando rememberMe es false', async () => {
    const long = await signCustomerToken(
      { id: 'abc', email: 'a@b.com', role: 'customer', token_version: 0 },
      { rememberMe: true },
    );
    const short = await signCustomerToken(
      { id: 'abc', email: 'a@b.com', role: 'customer', token_version: 0 },
      { rememberMe: false },
    );
    const longExp = decodeJwt(long).exp!;
    const shortExp = decodeJwt(short).exp!;
    expect(shortExp).toBeLessThan(longExp);
    expect((await verifyCustomerToken(short)).rm).toBe(false);
  });

  it('rechaza un token manipulado', async () => {
    const token = await signCustomerToken({ id: 'abc', email: 'a@b.com', role: 'customer', token_version: 0 });
    await expect(verifyCustomerToken(token + 'xx')).rejects.toThrow('inválida');
  });
});

// ── Resolución de sesión + revocación (token_version) ──────────────────────────
describe('resolveCustomerSession', () => {
  async function tokenFor(user: ReturnType<typeof makeUser>) {
    return signCustomerToken(user as never);
  }

  it('devuelve la sesión cuando todo coincide', async () => {
    const user = makeUser({ token_version: 1 });
    vi.mocked(usersRepo.findUserById).mockResolvedValue(user);
    const token = await tokenFor(user);

    const session = await resolveCustomerSession(token);
    expect(session).toEqual({ id: 'user-uuid-1', email: 'cliente@example.com', role: 'customer' });
  });

  it('devuelve null si token_version no coincide (logout / cambio de contraseña)', async () => {
    const user = makeUser({ token_version: 1 });
    const token = await tokenFor(user);
    // El servidor incrementó la versión después de emitir el token.
    vi.mocked(usersRepo.findUserById).mockResolvedValue(makeUser({ token_version: 2 }));

    const session = await resolveCustomerSession(token);
    expect(session).toBeNull();
  });

  it('devuelve null si el correo no está verificado y se exige verificación', async () => {
    const user = makeUser({ email_verified_at: null });
    const token = await tokenFor(user);
    vi.mocked(usersRepo.findUserById).mockResolvedValue(user);

    expect(await resolveCustomerSession(token, { requireVerifiedEmail: true })).toBeNull();
    // Pero pasa cuando no se exige verificación.
    expect(await resolveCustomerSession(token, { requireVerifiedEmail: false })).not.toBeNull();
  });

  it('devuelve null si el usuario fue borrado', async () => {
    const user = makeUser();
    const token = await tokenFor(user);
    vi.mocked(usersRepo.findUserById).mockResolvedValue(null);

    expect(await resolveCustomerSession(token)).toBeNull();
  });

  it('devuelve null con un token basura sin lanzar', async () => {
    expect(await resolveCustomerSession('no-es-un-jwt')).toBeNull();
  });
});

describe('refreshCustomerSession', () => {
  it('renueva el token si la sesión sigue válida', async () => {
    const user = makeUser({ token_version: 0 });
    const token = await signCustomerToken(user as never, { rememberMe: false });
    vi.mocked(usersRepo.findUserById).mockResolvedValue(user);

    const result = await refreshCustomerSession(token);
    expect(result).not.toBeNull();
    expect(result!.user.email).toBe('cliente@example.com');
    expect(result!.rememberMe).toBe(false);
    expect(decodeJwt(result!.token).rm).toBe(false);
  });

  it('devuelve null si token_version no coincide', async () => {
    const user = makeUser({ token_version: 0 });
    const token = await signCustomerToken(user as never);
    vi.mocked(usersRepo.findUserById).mockResolvedValue(makeUser({ token_version: 1 }));

    expect(await refreshCustomerSession(token)).toBeNull();
  });
});

// ── Proyección pública ──────────────────────────────────────────────────────────
describe('publicCustomer', () => {
  it('expone solo campos seguros y nunca el hash', () => {
    const out = publicCustomer(makeUser());
    expect(out).toEqual({
      id: 'user-uuid-1',
      email: 'cliente@example.com',
      fullName: 'Cliente Prueba',
      phone: '5512345678',
      role: 'customer',
      emailVerified: true,
    });
    expect(out).not.toHaveProperty('password_hash');
  });
});
