import type { Request, Response, NextFunction } from 'express';
import { verifyAdminToken } from '../services/admin-auth.service.js';
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

/**
 * Admin autenticado vía JWT cookie (HttpOnly) o Bearer token.
 * Acepta roles 'admin' y 'dev'. Requiere ADMIN_JWT_SECRET en el servidor.
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

    const payload = await verifyAdminToken(token);
    req.adminUser = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
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
 * Usar después de requireAdminAuth o de forma independiente.
 */
export async function requireDevAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Use the same cookie-aware extractor as requireAdminAuth.
    const token = extractAdminToken(req);

    if (!token) {
      res.status(401).json({ error: 'Inicia sesión en el panel admin' });
      return;
    }

    const payload = await verifyAdminToken(token);

    if (payload.role !== 'dev') {
      res.status(403).json({ error: 'Se requiere rol dev para esta acción' });
      return;
    }

    req.adminUser = {
      id: payload.sub,
      email: payload.email,
      role: 'dev',
    };
    next();
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(401).json({ error: err.message });
      return;
    }
    next(err);
  }
}
