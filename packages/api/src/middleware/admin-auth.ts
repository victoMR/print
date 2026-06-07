import type { Request, Response, NextFunction } from 'express';
import { resolveAdminSession, verifyAdminToken } from '../services/admin-auth.service.js';
import { AuthError } from '../types/errors.js';

declare global {
  namespace Express {
    interface Request {
      adminUser?: {
        id: string;
        email: string;
        role: 'admin' | 'dev';
      };
    }
  }
}

export function extractAdminToken(req: Request): string | null {
  // Prefer HttpOnly cookie (XSS-safe); fall back to Bearer for CLI/tooling access.
  const cookieHeader = req.headers.cookie ?? '';
  const cookieMatch = cookieHeader.match(/(?:^|;\s*)admin_token=([^;]+)/);
  if (cookieMatch) return decodeURIComponent(cookieMatch[1]);

  const header = req.header('authorization');
  return header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

export function extractAdminRefreshToken(req: Request): string | null {
  const cookieHeader = req.headers.cookie ?? '';
  const cookieMatch = cookieHeader.match(/(?:^|;\s*)admin_refresh=([^;]+)/);
  if (cookieMatch) return decodeURIComponent(cookieMatch[1]);
  return null;
}

/**
 * Admin autenticado vía access JWT (cookie HttpOnly o Bearer).
 * Valida token_version en BD para revocación inmediata en logout.
 */
export async function requireAdminAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractAdminToken(req);

    if (!token) {
      res.status(401).json({ error: 'Inicia sesión en el panel admin' });
      return;
    }

    const session = await resolveAdminSession(token);
    if (!session) {
      res.status(401).json({ error: 'Sesión expirada o inválida' });
      return;
    }

    req.adminUser = session;
    next();
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(401).json({ error: err.message });
      return;
    }
    next(err);
  }
}

/**
 * Solo usuarios con rol 'dev' (superadmin).
 */
export async function requireDevAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractAdminToken(req);

    if (!token) {
      res.status(401).json({ error: 'Inicia sesión en el panel admin' });
      return;
    }

    const session = await resolveAdminSession(token);
    if (!session) {
      res.status(401).json({ error: 'Sesión expirada o inválida' });
      return;
    }

    if (session.role !== 'dev') {
      res.status(403).json({ error: 'Se requiere rol dev para esta acción' });
      return;
    }

    req.adminUser = session;
    next();
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(401).json({ error: err.message });
      return;
    }
    next(err);
  }
}

/** Verifica JWT sin consultar BD (útil para diagnóstico). */
export { verifyAdminToken };
