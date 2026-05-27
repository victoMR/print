import axios, { type AxiosError } from 'axios';
import axiosRetry from 'axios-retry';

if (!process.env.PRINTFUL_TOKEN) {
  throw new Error('PRINTFUL_TOKEN is required');
}

export const printful = axios.create({
  baseURL: 'https://api.printful.com',
  timeout: 30_000,
  headers: {
    Authorization: `Bearer ${process.env.PRINTFUL_TOKEN}`,
    'X-PF-Language': 'es_ES',
    'Content-Type': 'application/json',
    ...(process.env.PRINTFUL_STORE_ID && { 'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID }),
  },
});

axiosRetry(printful, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (err: AxiosError) =>
    err.response?.status === 429 ||
    (err.response?.status ?? 0) >= 500,
});
