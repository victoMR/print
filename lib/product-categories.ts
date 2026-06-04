export const PRODUCT_CATEGORIES = [
  { value: "camiseta", label: "Camisetas" },
  { value: "sudadera", label: "Sudaderas" },
  { value: "gorra", label: "Gorras" },
  { value: "tenis", label: "Tenis" },
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]["value"];

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  camiseta: "Camisetas",
  sudadera: "Sudaderas",
  gorra: "Gorras",
  tenis: "Tenis",
};

export function categoryFromGarmentType(
  garmentType: "tshirt" | "hoodie" | "cap",
): ProductCategory {
  const map: Record<typeof garmentType, ProductCategory> = {
    tshirt: "camiseta",
    hoodie: "sudadera",
    cap: "gorra",
  };
  return map[garmentType];
}
