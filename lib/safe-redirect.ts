/** Ruta relativa same-origin segura (evita open redirect). */
export function safeRedirectPath(raw: string | null | undefined, fallback: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}

export function isAdminPath(path: string): boolean {
  return path === "/admin" || path.startsWith("/admin/");
}

export const ADMIN_LOGIN_PATH = "/admin/login";
