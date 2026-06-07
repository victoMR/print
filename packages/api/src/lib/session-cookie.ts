import type { CookieOptions, Response } from 'express';

const CUSTOMER_MAX_AGE_LONG_MS = 30 * 24 * 60 * 60 * 1000;
const CUSTOMER_MAX_AGE_SHORT_MS = 24 * 60 * 60 * 1000;
const ADMIN_MAX_AGE_MS = 8 * 60 * 60 * 1000;

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function sessionCookieOptions(): CookieOptions {
  const prod = isProduction();
  return {
    httpOnly: true,
    secure: prod,
    sameSite: prod ? 'strict' : 'lax',
    path: '/',
  };
}

export function setCustomerSessionCookie(res: Response, token: string, rememberMe: boolean): void {
  res.cookie('customer_token', token, {
    ...sessionCookieOptions(),
    maxAge: rememberMe ? CUSTOMER_MAX_AGE_LONG_MS : CUSTOMER_MAX_AGE_SHORT_MS,
  });
}

export function clearCustomerSessionCookie(res: Response): void {
  res.clearCookie('customer_token', sessionCookieOptions());
}

export function setAdminSessionCookie(res: Response, token: string): void {
  res.cookie('admin_token', token, {
    ...sessionCookieOptions(),
    maxAge: ADMIN_MAX_AGE_MS,
  });
}

export function clearAdminSessionCookie(res: Response): void {
  res.clearCookie('admin_token', sessionCookieOptions());
}
