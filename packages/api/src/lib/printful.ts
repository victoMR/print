import axios, { type AxiosError, type AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';

let printfulClient: AxiosInstance | null = null;

/** Mr. Paps puede operar sin Printful (catálogo Postgres + Envia + Stripe). */
export function isPrintfulConfigured(): boolean {
  return Boolean(process.env.PRINTFUL_TOKEN?.trim());
}

export function getPrintful(): AxiosInstance {
  if (!isPrintfulConfigured()) {
    throw new Error('PRINTFUL_TOKEN is required for Printful operations');
  }

  if (!printfulClient) {
    printfulClient = axios.create({
      baseURL: 'https://api.printful.com',
      timeout: 30_000,
      headers: {
        Authorization: `Bearer ${process.env.PRINTFUL_TOKEN}`,
        'X-PF-Language': 'es_ES',
        'Content-Type': 'application/json',
        ...(process.env.PRINTFUL_STORE_ID && {
          'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID,
        }),
      },
    });

    axiosRetry(printfulClient, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (err: AxiosError) =>
        err.response?.status === 429 || (err.response?.status ?? 0) >= 500,
    });
  }

  return printfulClient;
}

/** @deprecated Usar getPrintful() — proxy lazy para imports legacy. */
export const printful: AxiosInstance = new Proxy({} as AxiosInstance, {
  get(_target, prop, receiver) {
    const client = getPrintful();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
