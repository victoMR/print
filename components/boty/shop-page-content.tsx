"use client";

import { useState, useEffect, useRef } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { CatalogProductSummary } from "@/lib/api-types";
import { CatalogProductCard } from "./catalog-product-card";

type ShopPageContentProps = {
  products: CatalogProductSummary[];
};

/** Página Shop — mismo layout de la plantilla, productos reales del API. */
export function ShopPageContent({ products }: ShopPageContentProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="pt-28 pb-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-sm tracking-[0.3em] uppercase text-primary mb-4 block">
            Our Collection
          </span>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground mb-4 text-balance">
            Shop All Products
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Discover our complete range of natural skincare essentials
          </p>
        </div>

        <div className="flex items-center justify-between mb-10 pb-6 border-b border-border/50">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden inline-flex items-center gap-2 text-sm text-foreground"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>

          <div className="hidden lg:flex items-center gap-2">
            <span className="px-4 py-2 rounded-full text-sm bg-primary text-primary-foreground">
              Todos
            </span>
          </div>

          <span className="text-sm text-muted-foreground">
            {products.length} {products.length === 1 ? "product" : "products"}
          </span>
        </div>

        {showFilters && (
          <div className="lg:hidden fixed inset-0 z-50 bg-background">
            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-serif text-2xl text-foreground">Filters</h2>
                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className="p-2 text-foreground/70 hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="w-full px-6 py-4 rounded-2xl text-left bg-primary text-primary-foreground boty-transition"
              >
                Todos
              </button>
            </div>
          </div>
        )}

        {products.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-3xl boty-shadow">
            <p className="text-muted-foreground">
              No hay productos disponibles. Asegúrate de que el backend esté corriendo en el
              puerto 4000.
            </p>
          </div>
        ) : (
          <div ref={gridRef} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, index) => (
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
