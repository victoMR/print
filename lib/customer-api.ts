"use client";

import { getCustomerToken, setCustomerToken } from "./customer-session";
import type { CustomerSessionUser } from "./customer-session";

const V1 = "/api/v1";

function customerHeaders(): Record<string, string> {
  const token = getCustomerToken();
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json() as { error?: string } & T;
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Error ${res.status}`);
  return json;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
// Contraseña en texto plano solo por HTTPS → API aplica bcrypt y responde JWT.
// No hashear en el cliente (bcrypt/SHA256 aquí rompería el login).

export async function customerRegister(body: { email: string; password: string; fullName: string; phone?: string }) {
  const result = await apiFetch<{ data: { token: string; user: CustomerSessionUser } }>(`${V1}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  setCustomerToken(result.data.token);
  return result.data.user;
}

export async function customerLogin(email: string, password: string) {
  const result = await apiFetch<{ data: { token: string; user: CustomerSessionUser } }>(`${V1}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  setCustomerToken(result.data.token);
  return result.data.user;
}

// ── Perfil ────────────────────────────────────────────────────────────────────

export async function updateProfile(body: { fullName?: string; phone?: string | null }) {
  return apiFetch<{ data: CustomerSessionUser }>(`${V1}/account/profile`, {
    method: "PATCH",
    headers: customerHeaders(),
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
  const res = await apiFetch<{ data: SavedAddress[] }>(`${V1}/account/addresses`, { headers: customerHeaders() });
  return res.data;
}

export async function createAddress(body: Omit<SavedAddress, "id" | "isDefault"> & { isDefault?: boolean }) {
  return apiFetch<{ data: SavedAddress }>(`${V1}/account/addresses`, {
    method: "POST",
    headers: customerHeaders(),
    body: JSON.stringify(body),
  });
}

export async function updateAddress(id: string, body: Partial<Omit<SavedAddress, "id">>) {
  return apiFetch<{ data: SavedAddress }>(`${V1}/account/addresses/${id}`, {
    method: "PATCH",
    headers: customerHeaders(),
    body: JSON.stringify(body),
  });
}

export async function deleteAddress(id: string) {
  return apiFetch<{ data: { deleted: boolean } }>(`${V1}/account/addresses/${id}`, {
    method: "DELETE",
    headers: customerHeaders(),
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
  const res = await apiFetch<{ data: AccountOrder[] }>(`${V1}/account/orders`, { headers: customerHeaders() });
  return res.data;
}

// ── Pago ──────────────────────────────────────────────────────────────────────

export async function createPaymentIntent(publicOrderId: string): Promise<{ clientSecret: string }> {
  const token = getCustomerToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await apiFetch<{ data: { clientSecret: string } }>(`${V1}/checkout/payment-intent`, {
    method: "POST",
    headers,
    body: JSON.stringify({ publicOrderId }),
  });
  return res.data;
}
