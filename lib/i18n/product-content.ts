import type { Language } from "./locale";

/** Falls back to Spanish when there's no English translation yet (row not backfilled). */
export function localizedProductName(
  product: { name: string; nameEn: string | null },
  language: Language,
): string {
  if (language === "en" && product.nameEn) return product.nameEn;
  return product.name;
}

export function localizedProductDescription(
  product: { description: string; descriptionEn: string | null },
  language: Language,
): string {
  if (language === "en" && product.descriptionEn) return product.descriptionEn;
  return product.description;
}
