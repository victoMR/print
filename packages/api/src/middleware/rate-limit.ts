import rateLimit from 'express-rate-limit';

/** 5 requests per 15 minutes — auth endpoints */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera 15 minutos antes de volver a intentar.' },
  skipSuccessfulRequests: true,
});

/** 20 requests per minute — checkout and payment endpoints */
export const checkoutRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' },
});
