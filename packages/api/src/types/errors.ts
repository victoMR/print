export class PrintfulError extends Error {
  constructor(
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'PrintfulError';
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class BadRequestError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    /** Valores dinámicos para interpolar en el mensaje traducido del frontend (ej. cantidad disponible). */
    public readonly details?: Record<string, string | number>,
  ) {
    super(message);
    this.name = 'BadRequestError';
  }
}

export class NotFoundError extends Error {
  constructor(
    public readonly operation: string,
    public readonly code?: string,
  ) {
    super(`Not found: ${operation}`);
    this.name = 'NotFoundError';
  }
}

/**
 * Thrown when the currency of an order/payment clearly contradicts the
 * customer's real detected location (see app/api/v1/checkout/*.ts on the
 * Next.js side, which forward a fresh IP-geolocation result as a trusted
 * header). Never thrown on inconclusive geolocation — only on a confirmed mismatch.
 */
export class MarketMismatchError extends Error {
  constructor(
    message: string,
    public readonly detectedCountry?: string,
  ) {
    super(message);
    this.name = 'MarketMismatchError';
  }
}

export class PrintfulServerError extends Error {
  constructor(message?: string) {
    super(message ?? 'Printful server error');
    this.name = 'PrintfulServerError';
  }
}
