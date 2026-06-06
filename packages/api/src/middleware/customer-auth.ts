import type { Request, Response, NextFunction } from 'express';
import { verifyCustomerToken } from '../services/customer-auth.service.js';
import * as usersRepo from '../db/mrpaps-users.repository.js';
import { AuthError } from '../types/errors.js';

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
  try {
    const payload = await verifyCustomerToken(token);
    const user = await usersRepo.findUserById(payload.sub);
    if (!user || user.role !== 'customer' || !user.email_verified_at) {
      res.status(401).json({ error: 'Verifica tu correo o inicia sesión de nuevo.' });
      return;
    }
    req.customerUser = { id: payload.sub, email: payload.email, role: 'customer' };
    next();
  } catch (err) {
    if (err instanceof AuthError) { res.status(401).json({ error: err.message }); return; }
    next(err);
  }
}

export async function optionalCustomerAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractCustomerToken(req);
  if (token) {
    try {
      const payload = await verifyCustomerToken(token);
      req.customerUser = { id: payload.sub, email: payload.email, role: 'customer' };
    } catch { /* anonymous */ }
  }
  next();
}
