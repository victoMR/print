import type {
  AdminAnalyticsPeriod,
  AdminDashboardData,
  AdminDesign,
  AdminOrderSummary,
  AdminProductDetail,
  AdminProductSummary,
  GarmentTemplate,
  ProductComposition,
  CartSyncResponse,
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
import type { ProductCategory } from "./product-categories";
import { getAdminToken } from "./admin-session";
import { getCustomerToken } from "./customer-session";
import { broadcastSession } from "./session-broadcast";

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

  /** Código estable del error (ver packages/api/src/types/errors.ts) para traducir en el frontend. */
  get code(): string | undefined {
    return (this.body as { code?: string } | undefined)?.code;
  }

  /** Valores dinámicos para interpolar en el mensaje traducido (ej. cantidad disponible). */
  get details(): Record<string, string | number> | undefined {
    return (this.body as { details?: Record<string, string | number> } | undefined)?.details;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  retried = false,
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
      credentials: "include",
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

    // Intenta renovar sesión admin antes de cerrar (access token expirado).
    if (
      res.status === 401 &&
      !retried &&
      path.includes("/admin/") &&
      !path.includes("/admin/auth/login") &&
      !path.includes("/admin/auth/refresh")
    ) {
      const refreshed = await adminRefreshSession();
      if (refreshed) {
        broadcastSession({ type: "admin:refresh" });
        return apiFetch<T>(path, init, true);
      }
      broadcastSession({ type: "admin:logout" });
    } else if (res.status === 401 && path.includes("/admin/")) {
      broadcastSession({ type: "admin:logout" });
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

export type CatalogProductsParams = {
  category?: ProductCategory;
  q?: string;
  page?: number;
  limit?: number;
};

export async function fetchCatalogProducts(
  params?: CatalogProductsParams,
): Promise<CatalogListResponse | null> {
  if (!isApiConfigured()) return null;
  try {
    const search = new URLSearchParams();
    if (params?.category) search.set("category", params.category);
    if (params?.q?.trim()) search.set("q", params.q.trim());
    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));
    const qs = search.size > 0 ? `?${search.toString()}` : "";
    return await apiFetch<CatalogListResponse>(`${V1}/catalog/products${qs}`);
  } catch {
    return null;
  }
}

export async function fetchCatalogProduct(
  idOrSlug: string,
  market: "mx" | "us" = "mx",
): Promise<CatalogDetailResponse | null> {
  if (!isApiConfigured()) return null;
  try {
    return await apiFetch<CatalogDetailResponse>(
      `${V1}/catalog/products/${encodeURIComponent(idOrSlug)}?market=${market}`,
    );
  } catch {
    return null;
  }
}

/** Re-sincroniza precios, stock y metadatos del carrito con el catálogo. */
export async function syncCartWithCatalog(
  items: Array<{ variantId: string; quantity: number }>,
  market: "mx" | "us" = "mx",
): Promise<CartSyncResponse["data"]> {
  if (items.length === 0) return [];
  const res = await apiFetch<CartSyncResponse>(`${V1}/catalog/cart/sync?market=${market}`, {
    method: "POST",
    body: JSON.stringify({ items }),
    cache: "no-store",
  });
  return res.data;
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
    credentials: "include",
    headers: {
      Accept: "application/json",
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
      user: { id: string; email: string; fullName: string; role: "admin" | "dev" };
    };
  }>(`${V1}/admin/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  return {
    data: {
      user: {
        id: res.data.user.id,
        email: res.data.user.email,
        role: res.data.user.role,
      },
    },
  };
}

export async function adminLogout() {
  try {
    await apiFetch(`${V1}/admin/auth/logout`, { method: "POST", cache: "no-store" });
  } catch { /* ignore — clear local state regardless */ }
}

export async function adminRefreshSession(): Promise<{
  id: string;
  email: string;
  role: "admin" | "dev";
} | null> {
  const res = await fetch(`${getApiBase()}${V1}/admin/auth/refresh`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    data: { id: string; email: string; role: "admin" | "dev" } | null;
  };
  return json.data ?? null;
}

export async function adminFetchMe() {
  return apiFetch<{ data: { id: string; email: string; role: "admin" | "dev" } }>(
    `${V1}/admin/auth/me`,
    { headers: adminHeaders(), cache: "no-store" },
  );
}

// ─── Gestión de usuarios (solo dev) ──────────────────────────────────────────

export type AdminUserRow = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: "customer" | "admin" | "dev";
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function adminListUsers(params?: {
  role?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.role) qs.set("role", params.role);
  if (params?.search) qs.set("search", params.search);
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.offset != null) qs.set("offset", String(params.offset));

  const url = `${V1}/admin/users${qs.toString() ? `?${qs}` : ""}`;
  return apiFetch<{
    data: AdminUserRow[];
    meta: { total: number; limit: number; offset: number };
  }>(url, { headers: adminHeaders(), cache: "no-store" });
}

export async function adminCreateUser(body: {
  email: string;
  fullName: string;
  password: string;
  role: "admin" | "dev";
}) {
  return apiFetch<{ data: AdminUserRow }>(`${V1}/admin/users`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

export async function adminUpdateUserRole(userId: string, role: "customer" | "admin" | "dev") {
  return apiFetch<{ data: AdminUserRow }>(`${V1}/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify({ role }),
    cache: "no-store",
  });
}

export async function adminDeleteUser(userId: string) {
  const base = getApiBase();
  const url = `${base}${V1}/admin/users/${userId}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Accept: "application/json", ...adminHeaders() },
    cache: "no-store",
  });
  if (!res.ok && res.status !== 204) {
    let body: unknown;
    try { body = await res.json(); } catch { body = undefined; }
    const msg =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Error API ${res.status}`;
    throw new ApiError(msg, res.status, body);
  }
}

export async function fetchShippingRates(body: {
  items: Array<{ variantId: string; quantity: number }>;
  address: {
    address1: string;
    address2?: string;
    city: string;
    stateCode: string;
    countryCode: "MX" | "US";
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
  currency?: "MXN" | "USD";
  items: Array<{
    variantId: string;
    quantity: number;
    retailPriceMxn?: string;
    retailPriceUsd?: string;
  }>;
  address: {
    address1: string;
    address2?: string;
    city: string;
    stateCode: string;
    countryCode: "MX" | "US";
    zip: string;
  };
}) {
  return apiFetch<EstimateResponse>(`${V1}/checkout/estimate`, {
    method: "POST",
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

export async function finalizeOrderPayment(publicOrderId: string) {
  return apiFetch<{
    data: { paymentStatus: string; emailSent: boolean; message: string };
  }>(`${V1}/checkout/orders/${encodeURIComponent(publicOrderId)}/finalize-payment`, {
    method: "POST",
    cache: "no-store",
  });
}

export async function createDraftOrder(body: {
  items: Array<{
    variantId: string;
    quantity: number;
    retailPriceMxn?: string;
    retailPriceUsd?: string;
  }>;
  recipient: CheckoutRecipient;
  retailCosts: {
    currency: "MXN" | "USD";
    subtotal: string;
    shipping: string;
    tax: string;
    total: string;
  };
  saveAccount?: boolean;
  acceptedLegal?: true;
}) {
  return apiFetch<CreateOrderResponse>(`${V1}/checkout/orders`, {
    method: "POST",
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
  // Auth via HttpOnly cookie (credentials: 'include' set globally in apiFetch).
  return apiFetch<OrderDetailResponse>(
    `${V1}/account/orders/${encodeURIComponent(publicOrderId)}`,
    { cache: "no-store" },
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

export async function adminListOrders(filters?: {
  status?: MrpapsOrderStatus;
  excludeStatus?: MrpapsOrderStatus | MrpapsOrderStatus[];
  search?: string;
  currency?: "MXN" | "USD";
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.excludeStatus) {
    const excluded = Array.isArray(filters.excludeStatus)
      ? filters.excludeStatus
      : [filters.excludeStatus];
    for (const s of excluded) params.append("excludeStatus", s);
  }
  if (filters?.search?.trim()) params.set("search", filters.search.trim());
  if (filters?.currency) params.set("currency", filters.currency);
  const q = params.size > 0 ? `?${params.toString()}` : "";
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
  galleryUrls?: string[];
  retailPriceMxn?: number;
  retailPriceUsd?: number;
  status?: "active" | "inactive";
  templateId?: string;
  composition?: ProductComposition;
  defaultGarmentColor?: string;
  category?: ProductCategory;
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
    galleryUrls?: string[];
    status?: "active" | "inactive" | "archived";
    templateId?: string;
    composition?: ProductComposition;
    defaultGarmentColor?: string;
    category?: ProductCategory;
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
    retailPriceUsd?: number;
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
    retailPriceUsd?: number | null;
    stockQuantityMx?: number;
    stockQuantityUs?: number;
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

export async function adminGetColorImages(
  productId: string,
): Promise<{ data: Array<{ color: string; imageUrl: string }> }> {
  return apiFetch(`${V1}/admin/products/${encodeURIComponent(productId)}/color-images`, {
    headers: adminHeaders(),
    cache: "no-store",
  });
}

export async function adminSetColorImage(
  productId: string,
  colorLabel: string,
  imageUrl: string,
): Promise<{ data: { color: string; imageUrl: string } }> {
  return apiFetch(
    `${V1}/admin/products/${encodeURIComponent(productId)}/color-images/${encodeURIComponent(colorLabel)}`,
    {
      method: "PUT",
      headers: adminHeaders(),
      body: JSON.stringify({ imageUrl }),
      cache: "no-store",
    },
  );
}

export async function adminDeleteColorImage(
  productId: string,
  colorLabel: string,
): Promise<void> {
  await apiFetch(
    `${V1}/admin/products/${encodeURIComponent(productId)}/color-images/${encodeURIComponent(colorLabel)}`,
    {
      method: "DELETE",
      headers: adminHeaders(),
      cache: "no-store",
    },
  );
}

// ─── Analytics / dashboard ───────────────────────────────────────────────────

export async function adminFetchDashboard(filters?: {
  period?: AdminAnalyticsPeriod;
  from?: string;
  to?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.period) params.set("period", filters.period);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  const q = params.size > 0 ? `?${params.toString()}` : "";
  return apiFetch<{ data: AdminDashboardData }>(`${V1}/admin/analytics/dashboard${q}`, {
    headers: adminHeaders(),
    cache: "no-store",
  });
}

export async function adminDownloadAnalyticsReport(filters: {
  period: AdminAnalyticsPeriod;
  format: "csv" | "pdf";
  from?: string;
  to?: string;
}): Promise<void> {
  const base = getApiBase();
  const params = new URLSearchParams({
    period: filters.period,
    format: filters.format,
  });
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);

  const url = `${base}${V1}/admin/analytics/export?${params.toString()}`;
  const res = await fetch(url, {
    credentials: "include",
    headers: adminHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    let msg = `Error al descargar reporte (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch { /* ignore */ }
    throw new ApiError(msg, res.status);
  }

  const blob = await res.blob();
  const ext = filters.format === "pdf" ? "pdf" : "csv";
  const disposition = res.headers.get("content-disposition");
  const match = disposition?.match(/filename="?([^";]+)"?/);
  const filename = match?.[1] ?? `mrpaps-ventas.${ext}`;

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}
