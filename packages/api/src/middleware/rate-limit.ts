import rateLimit from 'express-rate-limit';

const defaultOptions = {
  standardHeaders: true,
  legacyHeaders: false,
};

/** 5 req / 15 min — login, reset, bootstrap (solo intentos fallidos). */
export const authRateLimit = rateLimit({
  ...defaultOptions,
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos. Espera 15 minutos antes de volver a intentar.' },
  skipSuccessfulRequests: true,
});

/** 30 req / min — shipping-rates y estimate (llaman a Envia externamente). */
export const shippingRateLimit = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Demasiadas solicitudes de cotización. Intenta de nuevo en un momento.' },
});

/** 20 req / min — creación de pedidos y pagos. */
export const checkoutRateLimit = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' },
});

/** 10 req / min — renovación de sesión (cookie sliding-window). */
export const sessionRefreshRateLimit = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Demasiadas renovaciones de sesión. Intenta de nuevo en un momento.' },
  skipSuccessfulRequests: false,
});

/** 10 req / min — uploads de archivos (costoso en CPU por sharp). */
export const uploadRateLimit = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Demasiados uploads. Espera un momento antes de subir más archivos.' },
});
