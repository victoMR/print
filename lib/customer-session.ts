const STORAGE_KEY = "mrpaps-customer-token";

export function getCustomerToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setCustomerToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearCustomerToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export type CustomerSessionUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: "customer";
  emailVerified?: boolean;
};
