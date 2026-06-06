// Auth is handled via HttpOnly cookie set by the server on login.
// sessionStorage is no longer used for the token.

/** @deprecated Token is now an HttpOnly cookie. Keep only for legacy cleanup. */
export function getAdminToken(): string | null {
  return null;
}

/** @deprecated Token is now an HttpOnly cookie set by the server. */
export function setAdminToken(_token: string): void {
  // no-op
}

export function clearAdminToken(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("mrpaps-admin-token");
}

export type AdminSessionUser = {
  id: string;
  email: string;
  role: "admin" | "dev";
};
