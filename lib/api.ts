import type {
  CatalogDetailResponse,
  CatalogListResponse,
  CreateOrderResponse,
  EstimateResponse,
  OrderStatusResponse,
  PrintfulCatalogProduct,
  PrintfulSyncProduct,
  ShippingRatesResponse,
  StoreProductDetailResponse,
  SyncProductPayload,
  SyncProductUpdatePayload,
} from "./api-types";
import type { CheckoutRecipient } from "./api-types";

const SERVER_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
const V1 = "/api/v1";

/** En el navegador usamos proxy same-origin (/api/v1 → backend) para evitar CORS. */
function getApiBase(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  return SERVER_BASE;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = getApiBase();
  if (!base && typeof window === "undefined" && !SERVER_BASE) {
    throw new Error(
      "NEXT_PUBLIC_API_URL no está configurada. Define la variable en .env",
    );
  }

  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...init?.headers,
      },
      cache: init?.cache ?? "no-store",
    });
  } catch (err) {
    const hint =
      typeof window !== "undefined"
        ? " ¿Está corriendo el API en el puerto 4000?"
        : "";
    throw new Error(
      `No se pudo conectar con el API.${hint} ${err instanceof Error ? err.message : ""}`.trim(),
    );
  }

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    const msg =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Error API ${res.status}`;
    throw new ApiError(msg, res.status, body);
  }

  const text = await res.text();
  if (!text.trim()) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError("Respuesta no JSON del API", res.status);
  }
}

export function isApiConfigured(): boolean {
  return Boolean(SERVER_BASE || typeof window !== "undefined");
}

export async function fetchCatalogProducts(): Promise<CatalogListResponse | null> {
  if (!isApiConfigured()) return null;
  try {
    return await apiFetch<CatalogListResponse>(`${V1}/catalog/products`);
  } catch {
    return null;
  }
}

export async function fetchCatalogProduct(
  idOrSlug: string,
): Promise<CatalogDetailResponse | null> {
  if (!isApiConfigured()) return null;
  try {
    return await apiFetch<CatalogDetailResponse>(
      `${V1}/catalog/products/${encodeURIComponent(idOrSlug)}`,
    );
  } catch {
    return null;
  }
}

export async function fetchShippingRates(body: {
  items: Array<{ syncVariantId: number; quantity: number }>;
  address: {
    address1: string;
    address2?: string;
    city: string;
    stateCode: string;
    countryCode: "MX";
    zip: string;
  };
  recipient?: {
    name: string;
    phone: string;
    email: string;
  };
}) {
  return apiFetch<ShippingRatesResponse>(`${V1}/checkout/shipping-rates`, {
    method: "POST",
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

export async function fetchEstimate(body: {
  items: Array<{
    syncVariantId: number;
    quantity: number;
    retailPriceMxn: string;
  }>;
  shippingMethod: string;
  address: {
    address1: string;
    address2?: string;
    city: string;
    stateCode: string;
    countryCode: "MX";
    zip: string;
  };
}) {
  return apiFetch<EstimateResponse>(`${V1}/checkout/estimate`, {
    method: "POST",
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

export async function createDraftOrder(body: {
  items: Array<{
    syncVariantId: number;
    quantity: number;
    retailPriceMxn: string;
  }>;
  shippingMethod: string;
  recipient: CheckoutRecipient;
  retailCosts: {
    currency: "MXN";
    subtotal: string;
    shipping: string;
    tax: string;
    total: string;
  };
}) {
  return apiFetch<CreateOrderResponse>(`${V1}/checkout/orders`, {
    method: "POST",
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

export async function fetchOrderStatus(internalOrderId: string) {
  return apiFetch<OrderStatusResponse>(
    `${V1}/orders/${encodeURIComponent(internalOrderId)}`,
    { cache: "no-store" },
  );
}

export async function adminListSyncProducts() {
  return apiFetch<{ data: PrintfulSyncProduct[] }>(`${V1}/admin/sync-products`, {
    cache: "no-store",
  });
}

export async function adminListCatalog() {
  return apiFetch<{ data: PrintfulCatalogProduct[] }>(`${V1}/admin/catalog`, {
    cache: "no-store",
  });
}

export async function adminGetCatalogProduct(id: number) {
  return apiFetch<{ data: unknown }>(`${V1}/admin/catalog/${id}`, {
    cache: "no-store",
  });
}

export async function adminCreateSyncProduct(payload: SyncProductPayload) {
  return apiFetch(`${V1}/admin/sync-products`, {
    method: "POST",
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export async function adminSyncCatalog() {
  return apiFetch(`${V1}/admin/sync-catalog`, {
    method: "POST",
    cache: "no-store",
  });
}

export async function adminGetSyncProduct(syncProductId: number) {
  return apiFetch<StoreProductDetailResponse>(
    `${V1}/admin/sync-products/${syncProductId}`,
    { cache: "no-store" },
  );
}

export async function adminUpdateSyncProduct(
  syncProductId: number,
  body: SyncProductUpdatePayload,
) {
  return apiFetch<{ data: unknown }>(
    `${V1}/admin/sync-products/${syncProductId}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );
}

export async function adminDeleteSyncProduct(syncProductId: number) {
  await apiFetch<undefined>(
    `${V1}/admin/sync-products/${syncProductId}`,
    {
      method: "DELETE",
      cache: "no-store",
    },
  );
}
