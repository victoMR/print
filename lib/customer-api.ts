"use client";

// Auth is now handled via HttpOnly cookie — no token in localStorage.
// All requests include credentials: 'include' so the cookie is sent automatically.
import type { CustomerSessionUser } from "./customer-session";

const V1 = "/api/v1";

const JSON_HEADERS = { "Content-Type": "application/json" };
const CREDENTIALS_OPTS: RequestInit = { credentials: "include" };

export class CustomerApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "CustomerApiError";
  }
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...CREDENTIALS_OPTS, ...init });
  const json = (await res.json()) as { error?: string; code?: string } & T;
  if (!res.ok) {
    throw new CustomerApiError(
      (json as { error?: string }).error ?? `Error ${res.status}`,
      (json as { code?: string }).code,
    );
  }
  return json;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
// Contraseña en texto plano solo por HTTPS → API aplica bcrypt y responde cookie HttpOnly.
// No hashear en el cliente (bcrypt/SHA256 aquí rompería el login).

export type RegisterResult = {
  requiresEmailVerification: true;
  email: string;
};

export async function customerRegister(body: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  acceptedTerms: true;
  acceptedPrivacy: true;
}): Promise<RegisterResult> {
  const result = await apiFetch<{ data: RegisterResult; message?: string }>(`${V1}/auth/register`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
  return result.data;
}

export async function verifyCustomerEmail(token: string) {
  return apiFetch<{ data: { email: string }; message?: string }>(`${V1}/auth/verify-email`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ token }),
  });
}

export async function resendVerificationEmail(email: string) {
  return apiFetch<{ message: string }>(`${V1}/auth/resend-verification`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ email }),
  });
}

export async function fetchEmailVerificationStatus(email: string) {
  const params = new URLSearchParams({ email: email.trim().toLowerCase() });
  return apiFetch<{ data: { verified: boolean } }>(`${V1}/auth/verification-status?${params}`, {
    cache: "no-store",
  });
}

export async function customerLogin(email: string, password: string) {
  // Server sets HttpOnly cookie — no token is returned in the response body.
  const result = await apiFetch<{ data: { user: CustomerSessionUser } }>(`${V1}/auth/login`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ email, password }),
  });
  return result.data.user;
}

export async function customerLogout(): Promise<void> {
  try {
    await apiFetch(`${V1}/auth/logout`, { method: "POST" });
  } catch { /* ignore — clear local state regardless */ }
}

// ── Perfil ────────────────────────────────────────────────────────────────────

export async function updateProfile(body: { fullName?: string; phone?: string | null }) {
  return apiFetch<{ data: CustomerSessionUser }>(`${V1}/account/profile`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

// ── Direcciones ───────────────────────────────────────────────────────────────

export type SavedAddress = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  address1: string;
  address2: string | null;
  city: string;
  stateCode: string;
  zip: string;
  isDefault: boolean;
};

export async function listAddresses(): Promise<SavedAddress[]> {
  const res = await apiFetch<{ data: SavedAddress[] }>(`${V1}/account/addresses`);
  return res.data;
}

export async function createAddress(body: Omit<SavedAddress, "id" | "isDefault"> & { isDefault?: boolean }) {
  return apiFetch<{ data: SavedAddress }>(`${V1}/account/addresses`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

export async function updateAddress(id: string, body: Partial<Omit<SavedAddress, "id">>) {
  return apiFetch<{ data: SavedAddress }>(`${V1}/account/addresses/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

export async function deleteAddress(id: string) {
  return apiFetch<{ data: { deleted: boolean } }>(`${V1}/account/addresses/${id}`, {
    method: "DELETE",
  });
}

// ── Pedidos ───────────────────────────────────────────────────────────────────

export type AccountOrder = {
  publicId: string;
  trackingCode: string;
  orderNumber: string;
  status: string;
  statusLabel: string;
  totalMxn: string;
  orderedAt: string;
  itemCount: number;
};

export async function listMyOrders(): Promise<AccountOrder[]> {
  const res = await apiFetch<{ data: AccountOrder[] }>(`${V1}/account/orders`);
  return res.data;
}

// ── Pago ──────────────────────────────────────────────────────────────────────

export async function createPaymentIntent(publicOrderId: string): Promise<{ clientSecret: string }> {
  const res = await apiFetch<{ data: { clientSecret: string } }>(`${V1}/checkout/payment-intent`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ publicOrderId }),
  });
  return res.data;
}
