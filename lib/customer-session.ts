// Customer auth is now handled via HttpOnly cookie set by the server on login.
// localStorage is no longer used — tokens stored there are not readable by XSS.

/** @deprecated Token is now an HttpOnly cookie. Always returns null. */
export function getCustomerToken(): string | null {
  return null;
}

/** @deprecated Token is now an HttpOnly cookie set by the server. No-op. */
export function setCustomerToken(_token: string): void {
  // no-op
}

export function clearCustomerToken(): void {
  if (typeof window === "undefined") return;
  // Remove any legacy localStorage token from before the cookie migration.
  localStorage.removeItem("mrpaps-customer-token");
}

export type CustomerSessionUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: "customer";
  emailVerified?: boolean;
};
