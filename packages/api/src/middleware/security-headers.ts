import type { NextFunction, Request, Response } from 'express';

/**
 * Headers de seguridad equivalentes a helmet().
 * Sin dependencia externa — funciona en cualquier entorno.
 *
 * Referencia: https://helmetjs.github.io/
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  // Evita que el navegador adivine el Content-Type (MIME sniffing).
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Bloquea la carga del API en iframes (clickjacking).
  res.setHeader('X-Frame-Options', 'DENY');

  // Deshabilita el auditor XSS antiguo de IE/Chrome (ya deprecated, pero seguro dejarlo en 0).
  res.setHeader('X-XSS-Protection', '0');

  // Limita la información de referrer enviada en requests externos.
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restringe acceso a APIs del dispositivo (cámara, micrófono, geolocalización, etc.).
  res.setHeader(
    'Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  );

  // HSTS: fuerza HTTPS por 1 año en producción. No aplicar en local (break HTTP dev).
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Cross-Origin Opener Policy: aísla la ventana del navegador.
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  // Elimina el header X-Powered-By: Express que revela el stack.
  res.removeHeader('X-Powered-By');

  next();
}
