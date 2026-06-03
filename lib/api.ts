import type {
  AdminDesign,
  AdminOrderSummary,
  AdminProductDetail,
  AdminProductSummary,
  GarmentTemplate,
  ProductComposition,
  CatalogDetailResponse,
  CatalogListResponse,
  CreateOrderResponse,
  EstimateResponse,
  MrpapsOrderStatus,
  OrderDetail,
  OrderDetailResponse,
  OrderStatusResponse,
  ShippingRatesResponse,
} from "./api-types";
import type { CheckoutRecipient } from "./api-types";
import { getAdminToken } from "./admin-session";
import { getCustomerToken } from "./customer-session";

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

function adminHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function adminMultipartFetch<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const base = getApiBase();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...adminHeaders(),
    },
    body: formData,
    cache: "no-store",
  });

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

  return (await res.json()) as T;
}

export async function adminLogin(email: string, password: string) {
  const res = await apiFetch<{
    data: {
      token: string;
      user: { id: string; email: string; fullName: string; role: "admin" };
    };
  }>(`${V1}/admin/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  return {
    data: {
      token: res.data.token,
      user: {
        id: res.data.user.id,
        email: res.data.user.email,
        role: "admin" as const,
      },
    },
  };
}

export async function adminFetchMe() {
  return apiFetch<{ data: { id: string; email: string; role: "admin" } }>(
    `${V1}/admin/auth/me`,
    { headers: adminHeaders(), cache: "no-store" },
  );
}

export async function fetchShippingRates(body: {
  items: Array<{ variantId: string; quantity: number }>;
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
    variantId: string;
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
    variantId: string;
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
  saveAccount?: boolean;
}) {
  const customerToken = typeof window !== "undefined" ? getCustomerToken() : null;
  const headers: Record<string, string> = {};
  if (customerToken) headers.Authorization = `Bearer ${customerToken}`;

  return apiFetch<CreateOrderResponse>(`${V1}/checkout/orders`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

export async function trackGuestOrder(trackingCode: string, email: string) {
  return apiFetch<OrderDetailResponse>(`${V1}/orders/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackingCode, email }),
    cache: "no-store",
  });
}

export async function fetchGuestOrderDetail(trackingCode: string, email: string) {
  const params = new URLSearchParams({ email });
  return apiFetch<OrderDetailResponse>(
    `${V1}/orders/${encodeURIComponent(trackingCode)}?${params.toString()}`,
    { cache: "no-store" },
  );
}

export async function fetchAccountOrderDetail(publicOrderId: string) {
  const token = getCustomerToken();
  if (!token) throw new Error("Inicia sesión para ver tu pedido");

  return apiFetch<OrderDetailResponse>(
    `${V1}/account/orders/${encodeURIComponent(publicOrderId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
}

/** @deprecated Usar fetchGuestOrderDetail o fetchAccountOrderDetail */
export async function fetchOrderDetail(publicOrderId: string, email?: string) {
  if (!email) {
    throw new Error("Se requiere el correo del pedido para consultar el estado.");
  }
  return fetchGuestOrderDetail(publicOrderId, email);
}

/** @deprecated Usar fetchOrderDetail */
export async function fetchOrderStatus(internalOrderId: string) {
  return fetchOrderDetail(internalOrderId);
}

export async function adminFetchOrderDetail(publicId: string) {
  return apiFetch<OrderDetailResponse>(
    `${V1}/admin/orders/${encodeURIComponent(publicId)}`,
    { headers: adminHeaders(), cache: "no-store" },
  );
}

export async function adminShippingQuote(body: {
  itemCount: number;
  address: {
    address1: string;
    address2?: string;
    city: string;
    stateCode: string;
    countryCode: "MX";
    zip: string;
  };
}) {
  return apiFetch<{ data: import("./api-types").AdminShippingQuoteResult }>(
    `${V1}/admin/shipping/quote`,
    {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );
}

export async function adminListOrders(status?: MrpapsOrderStatus) {
  const q = status ? `?status=${status}` : "";
  return apiFetch<{ data: AdminOrderSummary[] }>(`${V1}/admin/orders${q}`, {
    headers: adminHeaders(),
    cache: "no-store",
  });
}

export async function adminUpdateOrderStatus(
  publicId: string,
  body: {
    status: MrpapsOrderStatus;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    carrier?: string | null;
    internalNotes?: string | null;
    note?: string;
  },
) {
  return apiFetch<{ data: { publicId: string; status: MrpapsOrderStatus } }>(
    `${V1}/admin/orders/${encodeURIComponent(publicId)}/status`,
    {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );
}

export async function adminListTemplates() {
  return apiFetch<{ data: GarmentTemplate[] }>(`${V1}/admin/templates`, {
    headers: adminHeaders(),
    cache: "no-store",
  });
}

export type AdminUploadKind = "thumbnails" | "previews" | "exports";

export type AdminUploadOptions = {
  kind: AdminUploadKind;
  productId?: string;
  stagingId?: string;
};

export async function adminUploadAsset(file: Blob, options: AdminUploadOptions) {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", options.kind);
  if (options.productId) form.append("productId", options.productId);
  if (options.stagingId) form.append("stagingId", options.stagingId);
  return adminMultipartFetch<{
    data: { url: string; path: string; mime: string; size: number };
  }>(`${V1}/admin/uploads`, form);
}

export async function adminUploadDesign(
  file: File,
  fields?: { name?: string; description?: string },
) {
  const form = new FormData();
  form.append("file", file);
  if (fields?.name) form.append("name", fields.name);
  if (fields?.description) form.append("description", fields.description);
  return adminMultipartFetch<{ data: AdminDesign }>(`${V1}/admin/designs/upload`, form);
}

export async function adminListDesigns() {
  return apiFetch<{ data: AdminDesign[] }>(`${V1}/admin/designs`, {
    headers: adminHeaders(),
    cache: "no-store",
  });
}

export async function adminCreateDesign(body: {
  name: string;
  description?: string;
  fileUrl: string;
  thumbnailUrl?: string;
  tags?: string[];
}) {
  return apiFetch<{ data: AdminDesign }>(`${V1}/admin/designs`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

export async function adminDeleteDesign(id: string) {
  await apiFetch<undefined>(`${V1}/admin/designs/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: adminHeaders(),
    cache: "no-store",
  });
}

export async function adminListProducts() {
  return apiFetch<{ data: AdminProductSummary[] }>(`${V1}/admin/products`, {
    headers: adminHeaders(),
    cache: "no-store",
  });
}

export async function adminGetProduct(productId: string) {
  return apiFetch<{ data: AdminProductDetail }>(
    `${V1}/admin/products/${encodeURIComponent(productId)}`,
    { headers: adminHeaders(), cache: "no-store" },
  );
}

export async function adminCreateProduct(body: {
  name: string;
  slug?: string;
  description?: string;
  thumbnailUrl?: string;
  retailPriceMxn?: number;
  status?: "active" | "inactive";
  templateId?: string;
  composition?: ProductComposition;
  defaultGarmentColor?: string;
}) {
  return apiFetch<{ data: AdminProductSummary }>(`${V1}/admin/products`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

export async function adminUpdateProduct(
  productId: string,
  body: {
    name?: string;
    slug?: string;
    description?: string;
    thumbnailUrl?: string;
    status?: "active" | "inactive" | "archived";
    templateId?: string;
    composition?: ProductComposition;
    defaultGarmentColor?: string;
  },
) {
  return apiFetch(`${V1}/admin/products/${encodeURIComponent(productId)}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

export async function adminCreateProductVariant(
  productId: string,
  body: {
    sku: string;
    sizeLabel: string;
    colorLabel: string;
    retailPriceMxn: number;
    designId?: string | null;
    garmentColorHex?: string;
  },
) {
  return apiFetch(`${V1}/admin/products/${encodeURIComponent(productId)}/variants`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

export async function adminUpdateProductVariant(
  variantId: string,
  body: {
    sku?: string;
    sizeLabel?: string;
    colorLabel?: string;
    retailPriceMxn?: number;
    designId?: string | null;
    garmentColorHex?: string;
    status?: "active" | "inactive" | "archived";
  },
) {
  return apiFetch(`${V1}/admin/variants/${encodeURIComponent(variantId)}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  });
}
