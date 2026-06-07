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
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

export class NotFoundError extends Error {
  constructor(public readonly operation: string) {
    super(`Not found: ${operation}`);
    this.name = 'NotFoundError';
  }
}

export class PrintfulServerError extends Error {
  constructor(message?: string) {
    super(message ?? 'Printful server error');
    this.name = 'PrintfulServerError';
  }
}
