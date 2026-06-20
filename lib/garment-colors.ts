/** Colores base de la marca. Se pueden agregar más en el editor admin. */
export const BRAND_COLORS = [
  "Blanco",
  "Negro",
  "Gris Claro",
  "Gris Obscuro",
  "Verde",
  "Borgoña",
] as const;

export type BrandColor = (typeof BRAND_COLORS)[number];
