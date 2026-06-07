import type { CookieOptions, Response } from 'express';

const CUSTOMER_MAX_AGE_LONG_MS = 30 * 24 * 60 * 60 * 1000;
const CUSTOMER_MAX_AGE_SHORT_MS = 24 * 60 * 60 * 1000;
/** Access JWT admin (corto; se renueva con refresh token). */
const ADMIN_ACCESS_MAX_AGE_MS = 15 * 60 * 1000;
/** Refresh token opaco admin. */
const ADMIN_REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

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
    maxAge: ADMIN_ACCESS_MAX_AGE_MS,
  });
}

export function setAdminRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie('admin_refresh', refreshToken, {
    ...sessionCookieOptions(),
    maxAge: ADMIN_REFRESH_MAX_AGE_MS,
  });
}

export function clearAdminSessionCookie(res: Response): void {
  res.clearCookie('admin_token', sessionCookieOptions());
}

export function clearAdminRefreshCookie(res: Response): void {
  res.clearCookie('admin_refresh', sessionCookieOptions());
}

export function clearAllAdminSessionCookies(res: Response): void {
  clearAdminSessionCookie(res);
  clearAdminRefreshCookie(res);
}
