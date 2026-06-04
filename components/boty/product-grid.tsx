"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { fetchCatalogProducts } from "@/lib/api";
import type { CatalogProductSummary } from "@/lib/api-types";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type ProductCategory,
} from "@/lib/product-categories";
import { isNextImageSrc } from "@/lib/next-image-hosts";

const HOME_PRODUCT_LIMIT = 4;

function formatPrice(mxn: string): string {
  const n = Number.parseFloat(mxn);
  if (!Number.isFinite(n)) return mxn;
  return n.toLocaleString("es-MX", { maximumFractionDigits: 0 });
}

function normalizeCategory(raw: string | undefined): ProductCategory | null {
  if (!raw) return null;
  const found = PRODUCT_CATEGORIES.find((c) => c.value === raw);
  return found?.value ?? null;
}

type ProductGridProps = {
  initialProducts?: CatalogProductSummary[];
};

/** Sección de productos del Home — catálogo real desde API. */
export function ProductGrid({ initialProducts = [] }: ProductGridProps) {
  const [products, setProducts] = useState<CatalogProductSummary[]>(initialProducts);
  const [loading, setLoading] = useState(initialProducts.length === 0);
  const [fetchError, setFetchError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>("camiseta");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProducts(initialProducts);
    if (initialProducts.length > 0) {
      setLoading(false);
      const first = PRODUCT_CATEGORIES.find((c) =>
        initialProducts.some((p) => normalizeCategory(p.category) === c.value),
      );
      if (first) setSelectedCategory(first.value);
    }
  }, [initialProducts]);

  useEffect(() => {
    if (initialProducts.length > 0) return;

    let cancelled = false;
    fetchCatalogProducts({ limit: 48 })
      .then((res) => {
        if (cancelled) return;
        if (!res?.data?.length) {
          setFetchError(true);
          return;
        }
        setProducts(res.data);
        const first = PRODUCT_CATEGORIES.find((c) =>
          res.data.some((p) => normalizeCategory(p.category) === c.value),
        );
        if (first) setSelectedCategory(first.value);
      })
      .catch(() => {
        if (!cancelled) setFetchError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialProducts.length]);

  const categoriesWithProducts = useMemo(
    () =>
      PRODUCT_CATEGORIES.filter((c) =>
        products.some((p) => normalizeCategory(p.category) === c.value),
      ),
    [products],
  );

  const filteredProducts = useMemo(
    () =>
      products
        .filter((p) => normalizeCategory(p.category) === selectedCategory)
        .slice(0, HOME_PRODUCT_LIMIT),
    [products, selectedCategory],
  );

  const selectedIndex = Math.max(
    0,
    categoriesWithProducts.findIndex((c) => c.value === selectedCategory),
  );
  const categoryCount = Math.max(categoriesWithProducts.length, 1);

  const handleCategoryChange = (category: ProductCategory) => {
    if (category !== selectedCategory) {
      setIsTransitioning(true);
      setTimeout(() => {
        setSelectedCategory(category);
        setTimeout(() => setIsTransitioning(false), 50);
      }, 200);
    }
  };

  useEffect(() => {
    const headerObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setHeaderVisible(true);
      },
      { threshold: 0.1 },
    );

    if (headerRef.current) headerObserver.observe(headerRef.current);
    return () => headerObserver.disconnect();
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

        {categoriesWithProducts.length > 0 && (
          <div className="flex justify-center mb-12">
            <div className="inline-flex max-w-full overflow-x-auto bg-white/10 rounded-full p-1 gap-1 relative">
              {categoriesWithProducts.length > 1 && (
                <div
                  className="absolute top-1 bottom-1 bg-white rounded-full transition-all duration-300 ease-out shadow-sm"
                  style={{
                    left: `calc(${(selectedIndex / categoryCount) * 100}% + 4px)`,
                    width: `calc(${100 / categoryCount}% - 8px)`,
                  }}
                />
              )}
              {categoriesWithProducts.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => handleCategoryChange(category.value)}
                  className={`relative z-10 shrink-0 px-5 py-2.5 sm:px-6 rounded-full text-sm font-medium transition-all duration-300 min-h-11 ${
                    selectedCategory === category.value
                      ? categoriesWithProducts.length > 1
                        ? "text-primary"
                        : "text-primary bg-white rounded-full"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white/10 rounded-3xl aspect-[4/5] animate-pulse"
                aria-hidden
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <p className="text-center text-white/80">
            {fetchError
              ? "No pudimos cargar el catálogo. "
              : `No hay productos en ${PRODUCT_CATEGORY_LABELS[selectedCategory] ?? "esta categoría"}. `}
            <Link href="/shop" className="underline hover:text-white">
              Ver tienda completa
            </Link>
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product, index) => (
              <Link
                key={`${selectedCategory}-${product.id}`}
                href={`/product/${product.slug}`}
                className={`group transition-all duration-500 ease-out ${
                  isTransitioning ? "opacity-0 scale-95" : "opacity-100 scale-100"
                }`}
                style={{
                  transitionDelay: isTransitioning ? "0ms" : `${index * 60}ms`,
                }}
              >
                <div className="bg-white rounded-3xl overflow-hidden boty-shadow boty-transition border-2 border-transparent group-hover:border-white/50 group-hover:scale-[1.02]">
                  <div className="relative aspect-square bg-muted overflow-hidden">
                    {isNextImageSrc(product.thumbnail) ? (
                      <Image
                        src={product.thumbnail || "/placeholder.svg"}
                        alt={product.name}
                        fill
                        className="object-cover boty-transition group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.thumbnail || "/placeholder.svg"}
                        alt={product.name}
                        className="absolute inset-0 h-full w-full object-cover boty-transition group-hover:scale-105"
                      />
                    )}
                    {product.variantCount > 0 && (
                      <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs tracking-wide font-medium bg-white/90 text-foreground shadow-sm">
                        {product.variantCount}{" "}
                        {product.variantCount === 1 ? "variante" : "variantes"}
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
                    <h3 className="font-serif text-lg text-foreground mb-1 line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {PRODUCT_CATEGORY_LABELS[normalizeCategory(product.category) ?? "camiseta"]}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-muted-foreground">Desde</span>
                      <span className="font-medium text-foreground">
                        ${formatPrice(product.priceFromMxn)} MXN
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <Link
            href={`/shop?category=${selectedCategory}`}
            className="inline-flex items-center justify-center gap-2 bg-transparent border border-white/20 text-white px-8 py-4 rounded-full text-sm tracking-wide boty-transition hover:bg-white/10 min-h-11"
          >
            Ver todos en {PRODUCT_CATEGORY_LABELS[selectedCategory]}
          </Link>
        </div>
      </div>
    </section>
  );
}
