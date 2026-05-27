export type Product = {
  slug: string;
  name: string;
  description: string;
  priceMxn: number;
  category: string;
  image: string;
  featured?: boolean;
  sizes: string[];
  colors: string[];
};

export const products: Product[] = [
  {
    slug: "playera-algodon-negra",
    name: "Playera algodón premium",
    description:
      "Algodón peinado 180 g, impresión DTG de alta definición. Hecha en Tijuana, envío a todo México con tiempos realistas de 5–14 días.",
    priceMxn: 549,
    category: "Playeras",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80",
    featured: true,
    sizes: ["S", "M", "L", "XL"],
    colors: ["Negro", "Blanco", "Gris"],
  },
  {
    slug: "hoodie-urbano",
    name: "Hoodie urbano",
    description:
      "Interior afelpado, capucha reforzada y bolsillo canguro. Ideal para diseños de gran formato en pecho y espalda.",
    priceMxn: 899,
    category: "Sudaderas",
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80",
    featured: true,
    sizes: ["S", "M", "L", "XL", "2XL"],
    colors: ["Carbón", "Arena", "Verde bosque"],
  },
  {
    slug: "tote-eco",
    name: "Tote bag ecológica",
    description:
      "Lona resistente con asas reforzadas. Perfecta para ilustraciones minimalistas o logos de marca.",
    priceMxn: 299,
    category: "Accesorios",
    image:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80",
    featured: true,
    sizes: ["Única"],
    colors: ["Natural", "Negro"],
  },
  {
    slug: "gorra-dad-hat",
    name: "Gorra dad hat",
    description:
      "Ajuste metalizado, visera curva y bordado o parche según tu arte. Precio incluye IVA.",
    priceMxn: 449,
    category: "Gorras",
    image:
      "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&q=80",
    sizes: ["Única"],
    colors: ["Negro", "Azul marino", "Rojo"],
  },
  {
    slug: "poster-arte",
    name: "Póster arte galería",
    description:
      "Papel mate 200 g, colores vivos para ilustraciones y fotografía. Listo para enmarcar.",
    priceMxn: 199,
    category: "Decoración",
    image:
      "https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=800&q=80",
    sizes: ["30×40 cm", "50×70 cm"],
    colors: ["Único"],
  },
  {
    slug: "taza-ceramica",
    name: "Taza cerámica",
    description:
      "Sublimación 360° resistente al lavavajillas. Regalo corporativo o merch de banda.",
    priceMxn: 249,
    category: "Hogar",
    image:
      "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80",
    sizes: ["325 ml"],
    colors: ["Blanco"],
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getFeaturedProducts(): Product[] {
  return products.filter((p) => p.featured);
}
