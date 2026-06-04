"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { CatalogProductSummary } from "@/lib/api-types";
import type { ProductCategory } from "@/lib/product-categories";
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS } from "@/lib/product-categories";
import { CatalogProductCard } from "./catalog-product-card";
import { cn } from "@/lib/utils";

type ShopPageContentProps = {
  products: CatalogProductSummary[];
};

type FilterValue = "all" | ProductCategory;

const SHOP_FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "Todos" },
  ...PRODUCT_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
];

/** Página Shop — productos del API con filtro por categoría. */
export function ShopPageContent({ products }: ShopPageContentProps) {
  const [selectedCategory, setSelectedCategory] = useState<FilterValue>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "all") return products;
    return products.filter((p) => (p.category ?? "camiseta") === selectedCategory);
  }, [products, selectedCategory]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 },
    );

    if (gridRef.current) observer.observe(gridRef.current);

    return () => {
      if (gridRef.current) observer.unobserve(gridRef.current);
    };
  }, []);

  function selectCategory(value: FilterValue) {
    setSelectedCategory(value);
    setShowFilters(false);
  }

  return (
    <div className="pt-28 pb-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-sm tracking-[0.3em] uppercase text-primary mb-4 block">
            Colección
          </span>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground mb-4 text-balance">
            Tienda
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Sudaderas, gorras, tenis y más. Precios en MXN con IVA.
          </p>
        </div>

        <div className="flex items-center justify-between mb-10 pb-6 border-b border-border/50">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden inline-flex items-center gap-2 text-sm text-foreground"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Categorías
          </button>

          <div className="hidden lg:flex items-center gap-2 flex-wrap">
            {SHOP_FILTERS.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => selectCategory(cat.value)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm boty-transition",
                  selectedCategory === cat.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground",
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <span className="text-sm text-muted-foreground">
            {filteredProducts.length}{" "}
            {filteredProducts.length === 1 ? "producto" : "productos"}
            {selectedCategory !== "all" && (
              <span className="hidden sm:inline">
                {" "}
                · {PRODUCT_CATEGORY_LABELS[selectedCategory]}
              </span>
            )}
          </span>
        </div>

        {showFilters && (
          <div className="lg:hidden fixed inset-0 z-50 bg-background">
            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-serif text-2xl text-foreground">Categorías</h2>
                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className="p-2 text-foreground/70 hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2">
                {SHOP_FILTERS.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => selectCategory(cat.value)}
                    className={cn(
                      "w-full px-6 py-4 rounded-2xl text-left boty-transition",
                      selectedCategory === cat.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/40 text-foreground",
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-3xl boty-shadow">
            <p className="text-muted-foreground">
              {products.length === 0
                ? "No hay productos disponibles. Asegúrate de que el backend esté corriendo."
                : `No hay productos en ${selectedCategory === "all" ? "esta categoría" : PRODUCT_CATEGORY_LABELS[selectedCategory]}.`}
            </p>
          </div>
        ) : (
          <div ref={gridRef} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product, index) => (
              <CatalogProductCard
                key={product.id}
                product={product}
                index={index}
                isVisible={isVisible}
                showQuickAdd
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
