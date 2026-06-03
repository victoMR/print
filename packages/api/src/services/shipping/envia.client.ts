import axios from 'axios';
import { logger } from '../../lib/logger.js';
import { toEnviaStateCode } from '../../lib/mx-state-envia.js';

export type EnviaAddress = {
  name: string;
  phone: string;
  street: string;
  city: string;
  stateCode: string;
  zip: string;
  country?: string;
};

export type EnviaPackageInput = {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  declaredValueMxn?: number;
};

export type EnviaRateOption = {
  carrier: string;
  service: string;
  serviceDescription: string;
  totalPrice: string;
  currency: string;
  deliveryEstimate?: string;
};

function enviaBaseUrl(): string {
  const sandbox = process.env.ENVIA_SANDBOX !== 'false';
  return sandbox ? 'https://api-test.envia.com' : 'https://api.envia.com';
}

function getToken(): string | null {
  const token = process.env.ENVIA_API_TOKEN?.trim();
  return token || null;
}

export function isEnviaConfigured(): boolean {
  return Boolean(getToken());
}

function buildAddress(addr: EnviaAddress, fallbackName: string) {
  return {
    name: addr.name || fallbackName,
    phone: addr.phone || process.env.SHIP_ORIGIN_PHONE || '+525500000000',
    street: addr.street,
    city: addr.city,
    state: toEnviaStateCode(addr.stateCode),
    country: addr.country ?? 'MX',
    postalCode: addr.zip.replace(/\D/g, '').slice(0, 5),
  };
}

export async function quoteCarrierRates(
  carrier: string,
  origin: EnviaAddress,
  destination: EnviaAddress,
  pkg: EnviaPackageInput,
): Promise<EnviaRateOption[]> {
  const token = getToken();
  if (!token) return [];

  const client = axios.create({
    baseURL: enviaBaseUrl(),
    timeout: 25_000,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const body = {
    origin: buildAddress(origin, process.env.SHIP_ORIGIN_NAME || 'Mr. Paps'),
    destination: buildAddress(destination, 'Cliente'),
    packages: [
      {
        type: 'box',
        content: 'Apparel',
        amount: 1,
        declaredValue: pkg.declaredValueMxn ?? 500,
        weight: pkg.weightKg,
        weightUnit: 'KG',
        lengthUnit: 'CM',
        dimensions: {
          length: pkg.lengthCm,
          width: pkg.widthCm,
          height: pkg.heightCm,
        },
      },
    ],
    shipment: {
      type: 1,
      carrier: carrier.toLowerCase(),
    },
  };

  try {
    const { data } = await client.post<{ data?: EnviaRateOption[] }>('/ship/rate/', body);
    return data?.data ?? [];
  } catch (err: unknown) {
    const status = axios.isAxiosError(err) ? err.response?.status : undefined;
    const message = axios.isAxiosError(err)
      ? JSON.stringify(err.response?.data ?? err.message)
      : String(err);
    logger.warn({ carrier, status, message }, 'Envia rate quote failed');
    return [];
  }
}

export function getConfiguredCarriers(): string[] {
  const raw = process.env.ENVIA_CARRIERS ?? 'estafeta,dhl,fedex,paquetexpress';
  return raw
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
}

export function getOriginFromEnv(): EnviaAddress {
  return {
    name: process.env.SHIP_ORIGIN_NAME ?? 'Mr. Paps',
    phone: process.env.SHIP_ORIGIN_PHONE ?? '+525500000000',
    street: process.env.SHIP_ORIGIN_STREET ?? 'Av. Industrial',
    city: process.env.SHIP_ORIGIN_CITY ?? 'Tijuana',
    stateCode: process.env.SHIP_ORIGIN_STATE ?? 'BCN',
    zip: process.env.SHIP_ORIGIN_ZIP ?? '22000',
    country: 'MX',
  };
}

export function getDefaultPackage(itemCount: number): EnviaPackageInput {
  const perItem = Number(process.env.SHIP_PACKAGE_WEIGHT_KG_PER_ITEM ?? 0.45);
  const base = Number(process.env.SHIP_PACKAGE_WEIGHT_KG ?? 0.35);
  return {
    weightKg: Math.max(0.3, base + perItem * Math.max(0, itemCount - 1)),
    lengthCm: Number(process.env.SHIP_PACKAGE_LENGTH_CM ?? 35),
    widthCm: Number(process.env.SHIP_PACKAGE_WIDTH_CM ?? 28),
    heightCm: Number(process.env.SHIP_PACKAGE_HEIGHT_CM ?? 8),
    declaredValueMxn: Number(process.env.SHIP_PACKAGE_DECLARED_VALUE_MXN ?? 600),
  };
}
