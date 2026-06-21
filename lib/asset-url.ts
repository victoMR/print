/** Convierte URLs absolutas del API a ruta same-origin (`/uploads/...`). */
export function normalizeAssetUrl(url: string | null | undefined): string {
  if (!url?.trim()) return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("/uploads/")) return trimmed;

  try {
    const { pathname } = new URL(trimmed);
    if (pathname.startsWith("/uploads/")) return pathname;
  } catch {
    // no es URL absoluta
  }

  return trimmed;
}

export function resolveProductImageSrc(
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    const normalized = normalizeAssetUrl(candidate);
    if (normalized) return normalized;
  }
  return "/placeholder.svg";
}
