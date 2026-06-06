import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import {
  AuthError,
  BadRequestError,
  NotFoundError,
  PrintfulServerError,
  RateLimitError,
} from '../types/errors.js';
import { logger } from '../lib/logger.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'El archivo supera el límite de 20 MB.'
      : err.message;
    res.status(400).json({ ok: false, error: message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      ok: false,
      error: 'Validación fallida',
      details: err.flatten(),
    });
    return;
  }

  if (err instanceof BadRequestError) {
    res.status(400).json({ ok: false, error: err.message });
    return;
  }

  if (err instanceof AuthError) {
    res.status(401).json({ ok: false, error: err.message });
    return;
  }

  if (err instanceof RateLimitError) {
    res.status(429).json({ ok: false, error: err.message });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({ ok: false, error: err.message });
    return;
  }

  if (err instanceof PrintfulServerError) {
    res.status(502).json({ ok: false, error: err.message });
    return;
  }

  const pg = err as { code?: string; message?: string };
  // Handle missing-column errors with generic messages that don't reveal schema details.
  // Log the full DB error server-side; never surface column/table names to the client.
  if (pg?.code === '42703') {
    logger.error({ err }, 'Missing DB column — run migrations: pnpm --filter @print/api migrate');
    res.status(503).json({
      ok: false,
      error: 'Servicio temporalmente no disponible. El administrador ha sido notificado.',
    });
    return;
  }

  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ ok: false, error: 'Error interno del servidor' });
}
