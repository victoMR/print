import type { Locale } from "./locale";

/** Falls back to Spanish when there's no English translation yet (row not backfilled). */
export function localizedProductName(
  product: { name: string; nameEn: string | null },
  locale: Locale,
): string {
  if (locale === "en" && product.nameEn) return product.nameEn;
  return product.name;
}

export function localizedProductDescription(
  product: { description: string; descriptionEn: string | null },
  locale: Locale,
): string {
  if (locale === "en" && product.descriptionEn) return product.descriptionEn;
  return product.description;
}
