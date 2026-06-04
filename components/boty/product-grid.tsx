"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

type Category = "camisetas" | "sudaderas" | "accesorios";

const products = [
  {
    id: "camiseta-clasica",
    name: "Camiseta Clásica",
    description: "Algodón 100%, corte unisex",
    price: 399,
    originalPrice: null,
    image: "/images/products/serum-bottles-1.png",
    badge: "Bestseller",
    category: "camisetas" as Category,
  },
  {
    id: "camiseta-oversize",
    name: "Camiseta Oversize",
    description: "Corte holgado, algodón premium",
    price: 449,
    originalPrice: null,
    image: "/images/products/eye-serum-bottles.png",
    badge: null,
    category: "camisetas" as Category,
  },
  {
    id: "camiseta-manga-larga",
    name: "Manga Larga",
    description: "Ideal para cualquier temporada",
    price: 479,
    originalPrice: null,
    image: "/images/products/amber-dropper-bottles.png",
    badge: "Nuevo",
    category: "camisetas" as Category,
  },
  {
    id: "camiseta-crop",
    name: "Crop Top",
    description: "Corte moderno y fresco",
    price: 349,
    originalPrice: 399,
    image: "/images/products/spray-bottles.png",
    badge: "Oferta",
    category: "camisetas" as Category,
  },
  {
    id: "sudadera-clasica",
    name: "Sudadera Clásica",
    description: "Interior afelpado, calidez total",
    price: 699,
    originalPrice: null,
    image: "/images/products/cream-jars-colored.png",
    badge: null,
    category: "sudaderas" as Category,
  },
  {
    id: "hoodie-premium",
    name: "Hoodie Premium",
    description: "Con gorro y bolsillo canguro",
    price: 799,
    originalPrice: 899,
    image: "/images/products/tube-bottles.png",
    badge: "Oferta",
    category: "sudaderas" as Category,
  },
  {
    id: "sudadera-zip",
    name: "Sudadera con Cierre",
    description: "Estilo versátil para diario",
    price: 749,
    originalPrice: null,
    image: "/images/products/jars-wooden-lid.png",
    badge: "Bestseller",
    category: "sudaderas" as Category,
  },
  {
    id: "crew-neck",
    name: "Crew Neck",
    description: "Cuello redondo, ajuste perfecto",
    price: 649,
    originalPrice: null,
    image: "/images/products/pump-bottles-lavender.png",
    badge: null,
    category: "sudaderas" as Category,
  },
  {
    id: "gorra-snapback",
    name: "Gorra Snapback",
    description: "Bordado personalizado",
    price: 349,
    originalPrice: null,
    image: "/images/products/amber-dropper-bottles.png",
    badge: "Nuevo",
    category: "accesorios" as Category,
  },
  {
    id: "tote-bag",
    name: "Tote Bag",
    description: "Bolsa de algodón orgánico",
    price: 249,
    originalPrice: null,
    image: "/images/products/serum-bottles-1.png",
    badge: null,
    category: "accesorios" as Category,
  },
  {
    id: "funda-celular",
    name: "Funda de Celular",
    description: "Protección con estilo propio",
    price: 299,
    originalPrice: null,
    image: "/images/products/spray-bottles.png",
    badge: null,
    category: "accesorios" as Category,
  },
  {
    id: "poster-arte",
    name: "Póster de Arte",
    description: "Impresión giclée de alta calidad",
    price: 199,
    originalPrice: null,
    image: "/images/products/pump-bottles-cream.png",
    badge: "Bestseller",
    category: "accesorios" as Category,
  },
];

const categories = [
  { value: "camisetas" as Category, label: "Camisetas" },
  { value: "sudaderas" as Category, label: "Sudaderas" },
  { value: "accesorios" as Category, label: "Accesorios" },
];

/** Sección de productos del Home — plantilla original (showcase visual). */
export function ProductGrid() {
  const [selectedCategory, setSelectedCategory] = useState<Category>("camisetas");
  const [isVisible, setIsVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const filteredProducts = products.filter((product) => product.category === selectedCategory);

  const handleCategoryChange = (category: Category) => {
    if (category !== selectedCategory) {
      setIsTransitioning(true);
      setTimeout(() => {
        setSelectedCategory(category);
        setTimeout(() => setIsTransitioning(false), 50);
      }, 300);
    }
  };

  useEffect(() => {
    products.forEach((product) => {
      const img = new window.Image();
      img.src = product.image;
    });
  }, []);

  useEffect(() => {
    const gridObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 },
    );
    const headerObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setHeaderVisible(true);
      },
      { threshold: 0.1 },
    );

    if (gridRef.current) gridObserver.observe(gridRef.current);
    if (headerRef.current) headerObserver.observe(headerRef.current);

    return () => {
      if (gridRef.current) gridObserver.unobserve(gridRef.current);
      if (headerRef.current) headerObserver.unobserve(headerRef.current);
    };
  }, []);

  return (
    <section className="py-24 bg-primary">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div ref={headerRef} className="text-center mb-16">
          <span
            className={`text-sm tracking-[0.3em] uppercase text-white/90 mb-4 block ${headerVisible ? "animate-blur-in opacity-0" : "opacity-0"}`}
            style={
              headerVisible
                ? { animationDelay: "0.2s", animationFillMode: "forwards" }
                : {}
            }
          >
            Nuestra Colección
          </span>
          <h2
            className={`font-serif leading-tight text-white mb-4 text-balance text-4xl sm:text-5xl md:text-6xl lg:text-7xl ${headerVisible ? "animate-blur-in opacity-0" : "opacity-0"}`}
            style={
              headerVisible
                ? { animationDelay: "0.4s", animationFillMode: "forwards" }
                : {}
            }
          >
            Tu estilo, tu regla
          </h2>
          <p
            className={`text-lg text-white/80 max-w-md mx-auto ${headerVisible ? "animate-blur-in opacity-0" : "opacity-0"}`}
            style={
              headerVisible
                ? { animationDelay: "0.6s", animationFillMode: "forwards" }
                : {}
            }
          >
            Productos personalizados impresos bajo demanda para expresar tu estilo único
          </p>
        </div>

        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-white/10 rounded-full p-1 gap-1 relative">
            <div
              className="absolute top-1 bottom-1 bg-white rounded-full transition-all duration-300 ease-out shadow-sm"
              style={{
                left:
                  selectedCategory === "camisetas"
                    ? "4px"
                    : selectedCategory === "sudaderas"
                      ? "calc(33.333% + 2px)"
                      : "calc(66.666%)",
                width: "calc(33.333% - 4px)",
              }}
            />
            {categories.map((category) => (
              <button
                key={category.value}
                type="button"
                onClick={() => handleCategoryChange(category.value)}
                className={`relative z-10 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  selectedCategory === category.value
                    ? "text-primary"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        <div ref={gridRef} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product, index) => (
            <Link
              key={`${selectedCategory}-${product.id}`}
              href="/shop"
              className={`group transition-all duration-500 ease-out ${
                isVisible && !isTransitioning ? "opacity-100 scale-100" : "opacity-0 scale-95"
              }`}
              style={{ transitionDelay: isTransitioning ? "0ms" : `${index * 80}ms` }}
            >
              <div className="bg-white rounded-3xl overflow-hidden boty-shadow boty-transition border-2 border-transparent group-hover:border-white/50 group-hover:scale-[1.02]">
                <div className="relative aspect-square bg-muted overflow-hidden">
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    fill
                    className="object-cover boty-transition group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  {product.badge && (
                    <span
                      className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs tracking-wide font-medium ${
                        product.badge === "Oferta"
                          ? "bg-destructive text-destructive-foreground shadow-sm"
                          : product.badge === "Nuevo"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-accent text-accent-foreground"
                      }`}
                    >
                      {product.badge}
                    </span>
                  )}
                  <span
                    className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 boty-transition boty-shadow"
                    aria-hidden
                  >
                    <ShoppingBag className="w-4 h-4 text-black" />
                  </span>
                </div>

                <div className="p-5">
                  <h3 className="font-serif text-lg text-foreground mb-1">{product.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{product.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">${product.price}</span>
                    {product.originalPrice && (
                      <span className="text-sm text-muted-foreground line-through">
                        ${product.originalPrice}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-2 bg-transparent border border-white/20 text-white px-8 py-4 rounded-full text-sm tracking-wide boty-transition hover:bg-white/10"
          >
            Ver Todos los Productos
          </Link>
        </div>
      </div>
    </section>
  );
}
