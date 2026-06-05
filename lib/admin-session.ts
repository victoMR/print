const STORAGE_KEY = "mrpaps-admin-token";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

export function setAdminToken(token: string): void {
  sessionStorage.setItem(STORAGE_KEY, token);
}

export function clearAdminToken(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export type AdminSessionUser = {
  id: string;
  email: string;
  role: "admin" | "dev";
};
