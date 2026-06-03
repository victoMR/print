/** Tallas habituales para variantes de prenda (admin + compositor). */
export const GARMENT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export type GarmentSize = (typeof GARMENT_SIZES)[number];
