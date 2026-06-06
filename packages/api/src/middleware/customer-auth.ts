import type { Request, Response, NextFunction } from 'express';
import { resolveCustomerSession } from '../services/customer-auth.service.js';
import { incrementCustomerTokenVersion } from '../db/mrpaps-users.repository.js';

declare global {
  namespace Express {
    interface Request {
      customerUser?: { id: string; email: string; role: 'customer' };
    }
  }
}

/**
 * HttpOnly cookie (preferred, XSS-safe) → Bearer header fallback (SSR / mobile apps).
 */
function extractCustomerToken(req: Request): string | null {
  const cookieHeader = req.headers.cookie ?? '';
  const match = cookieHeader.match(/(?:^|;\s*)customer_token=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);
  const header = req.header('authorization');
  return header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

export async function requireCustomerAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractCustomerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Inicia sesión para continuar' });
    return;
  }
  const session = await resolveCustomerSession(token, { requireVerifiedEmail: true });
  if (!session) {
    res.status(401).json({ error: 'Verifica tu correo o inicia sesión de nuevo.' });
    return;
  }
  req.customerUser = session;
  next();
}

export async function optionalCustomerAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractCustomerToken(req);
  if (token) {
    const session = await resolveCustomerSession(token, { requireVerifiedEmail: false });
    if (session) req.customerUser = session;
  }
  next();
}

/** Invalida el JWT actual (logout server-side). */
export async function revokeCustomerSession(userId: string): Promise<void> {
  await incrementCustomerTokenVersion(userId);
}
