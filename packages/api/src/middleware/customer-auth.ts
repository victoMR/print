import type { Request, Response, NextFunction } from 'express';
import { verifyCustomerToken } from '../services/customer-auth.service.js';
import { AuthError } from '../types/errors.js';

declare global {
  namespace Express {
    interface Request {
      customerUser?: { id: string; email: string; role: 'customer' };
    }
  }
}

export async function requireCustomerAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) {
    res.status(401).json({ error: 'Inicia sesión para continuar' });
    return;
  }
  try {
    const payload = await verifyCustomerToken(token);
    req.customerUser = { id: payload.sub, email: payload.email, role: 'customer' };
    next();
  } catch (err) {
    if (err instanceof AuthError) { res.status(401).json({ error: err.message }); return; }
    next(err);
  }
}

export async function optionalCustomerAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (token) {
    try {
      const payload = await verifyCustomerToken(token);
      req.customerUser = { id: payload.sub, email: payload.email, role: 'customer' };
    } catch { /* anonymous */ }
  }
  next();
}
