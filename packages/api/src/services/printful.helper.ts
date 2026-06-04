import type { AxiosResponse } from 'axios';
import { acquirePrintfulRateLimit } from '../lib/printful-rate-limit.js';
import { logger } from '../lib/logger.js';
import type { PrintfulResponse } from '../types/printful.types.js';
import {
  AuthError,
  BadRequestError,
  NotFoundError,
  PrintfulError,
  PrintfulServerError,
  RateLimitError,
} from '../types/errors.js';

export interface CallPrintfulContext {
  operation: string;
  internalId?: string;
  printfulOrderId?: number;
  eventType?: string;
}

export async function callPrintful<T>(
  fn: () => Promise<AxiosResponse<PrintfulResponse<T>>>,
  context: CallPrintfulContext,
): Promise<T> {
  await acquirePrintfulRateLimit();

  try {
    const { data } = await fn();
    if (data.code !== 200) {
      throw new PrintfulError(`Unexpected code: ${data.code}`, data);
    }
    logger.info({
      ...context,
      event_type: context.eventType,
      internal_order_id: context.internalId,
      printful_order_id: context.printfulOrderId,
      status: 'ok',
    });
    return data.result;
  } catch (err: unknown) {
    const axiosErr = err as {
      response?: { status?: number; data?: { error?: { reason?: string; message?: string } } };
    };
    const status = axiosErr.response?.status;
    const printfulError = axiosErr.response?.data?.error;

    logger.error({
      ...context,
      event_type: context.eventType,
      internal_order_id: context.internalId,
      printful_order_id: context.printfulOrderId,
      status_code: status,
      reason: printfulError?.reason,
      message: printfulError?.message,
    });

    if (status === 401) throw new AuthError('Printful token invalid or expired');
    if (status === 429) throw new RateLimitError('Printful rate limit hit');
    if (status === 400) {
      throw new BadRequestError(printfulError?.message ?? 'Solicitud rechazada por Printful');
    }
    if (status === 404) throw new NotFoundError(context.operation);
    if (status !== undefined && status >= 500) {
      throw new PrintfulServerError(printfulError?.message);
    }

    throw err;
  }
}
