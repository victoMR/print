import type { Request, Response, NextFunction } from 'express';
import { verifyAdminToken } from '../services/admin-auth.service.js';
import { AuthError } from '../types/errors.js';

declare global {
  namespace Express {
    interface Request {
      adminUser?: {
        id: string;
        email: string;
        role: 'admin';
      };
    }
  }
}

/**
 * Admin autenticado vía JWT (Bearer) emitido en POST /api/v1/admin/auth/login.
 * Requiere ADMIN_JWT_SECRET en el servidor.
 */
export async function requireAdminAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;

    if (!token) {
      res.status(401).json({ error: 'Inicia sesión en el panel admin' });
      return;
    }

    const payload = await verifyAdminToken(token);
    req.adminUser = {
      id: payload.sub,
      email: payload.email,
      role: 'admin',
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
