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
  if (pg?.code === '42703' && pg.message?.includes('garment_color_hex')) {
    res.status(503).json({
      ok: false,
      error:
        'Falta la columna garment_color_hex. Ejecuta: pnpm --filter @print/api migrate',
    });
    return;
  }

  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ ok: false, error: 'Error interno del servidor' });
}
