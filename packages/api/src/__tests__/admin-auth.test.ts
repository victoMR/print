import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

// --- Mock external dependencies so tests run without a database ---
vi.mock('../db/mrpaps-users.repository.js', () => ({
  findUserByEmailForAuth: vi.fn(),
}));
vi.mock('../lib/password.js', () => ({
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
}));

import * as usersRepo from '../db/mrpaps-users.repository.js';
import * as passwordLib from '../lib/password.js';

// Set a valid JWT secret before importing the service; restored in afterAll
const _originalJwtSecret = process.env.ADMIN_JWT_SECRET;
process.env.ADMIN_JWT_SECRET = 'test-secret-that-is-at-least-32-chars-long!!';

const { loginAdmin, signAdminToken, verifyAdminToken } = await import('../services/admin-auth.service.js');

afterAll(() => {
  if (_originalJwtSecret === undefined) {
    delete process.env.ADMIN_JWT_SECRET;
  } else {
    process.env.ADMIN_JWT_SECRET = _originalJwtSecret;
  }
});

const MOCK_ADMIN_USER = {
  id: 'user-uuid-123',
  auth_user_id: null,
  email: 'admin@example.com',
  full_name: 'Admin',
  role: 'admin' as const,
  password_hash: '$2b$10$hash',
  tax_number: null,
  phone: null,
  email_verified_at: null,
  email_verification_token_hash: null,
  email_verification_expires_at: null,
  terms_accepted_at: null,
  terms_accepted_version: null,
  privacy_accepted_at: null,
  privacy_accepted_version: null,
  token_version: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('Admin Auth — loginAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns token and user on valid credentials', async () => {
    vi.mocked(usersRepo.findUserByEmailForAuth).mockResolvedValue(MOCK_ADMIN_USER);
    vi.mocked(passwordLib.verifyPassword).mockResolvedValue(true);

    const result = await loginAdmin('admin@example.com', 'correct-password');
    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe('admin@example.com');
    expect(result.user.role).toBe('admin');
  });

  it('throws AuthError on wrong password', async () => {
    vi.mocked(usersRepo.findUserByEmailForAuth).mockResolvedValue(MOCK_ADMIN_USER);
    vi.mocked(passwordLib.verifyPassword).mockResolvedValue(false);

    await expect(loginAdmin('admin@example.com', 'wrong')).rejects.toThrow(
      'Correo o contraseña incorrectos',
    );
  });

  it('throws AuthError when user not found', async () => {
    vi.mocked(usersRepo.findUserByEmailForAuth).mockResolvedValue(null);

    await expect(loginAdmin('nobody@example.com', 'pass')).rejects.toThrow(
      'Correo o contraseña incorrectos',
    );
  });

  it('throws AuthError when user role is not admin', async () => {
    vi.mocked(usersRepo.findUserByEmailForAuth).mockResolvedValue({
      ...MOCK_ADMIN_USER,
      role: 'customer' as never,
    });

    await expect(loginAdmin('admin@example.com', 'pass')).rejects.toThrow(
      'Correo o contraseña incorrectos',
    );
  });

  it('locks account after 5 failed attempts', async () => {
    vi.mocked(usersRepo.findUserByEmailForAuth).mockResolvedValue(MOCK_ADMIN_USER);
    vi.mocked(passwordLib.verifyPassword).mockResolvedValue(false);

    const email = `lockout-test-${Date.now()}@example.com`;
    for (let i = 0; i < 5; i++) {
      await expect(loginAdmin(email, 'wrong')).rejects.toThrow('Correo o contraseña incorrectos');
    }

    await expect(loginAdmin(email, 'wrong')).rejects.toThrow('Cuenta bloqueada temporalmente');
  });
});

describe('Admin Auth — token lifecycle', () => {
  it('signs a token and verifies it', async () => {
    const token = await signAdminToken({ id: 'abc', email: 'x@y.com', role: 'admin' });
    const payload = await verifyAdminToken(token);
    expect(payload.sub).toBe('abc');
    expect(payload.email).toBe('x@y.com');
    expect(payload.role).toBe('admin');
  });

  it('rejects a tampered token', async () => {
    const token = await signAdminToken({ id: 'abc', email: 'x@y.com', role: 'admin' });
    await expect(verifyAdminToken(token + 'tampered')).rejects.toThrow();
  });
});
