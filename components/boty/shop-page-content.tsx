"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Search, X } from "lucide-react";
import type { CatalogProductSummary } from "@/lib/api-types";
import { fetchCatalogProducts } from "@/lib/api";
import { CatalogProductCard } from "./catalog-product-card";
import { cn } from "@/lib/utils";

type ShopPageContentProps = {
  products: CatalogProductSummary[];
};

const CATALOG_LIMIT = 48;
const SEARCH_DEBOUNCE_MS = 300;

/** Página Shop — productos del API con búsqueda por nombre. */
export function ShopPageContent({ products: initialProducts }: ShopPageContentProps) {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState(initialProducts);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchIdRef = useRef(0);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const filterClientSide = useCallback(
    (source: CatalogProductSummary[]) => {
      if (!searchQuery) return source;
      const term = searchQuery.toLowerCase();
      return source.filter(
        (p) => p.name.toLowerCase().includes(term) || p.slug.toLowerCase().includes(term),
      );
    },
    [searchQuery],
  );

  const loadProducts = useCallback(async () => {
    const requestId = ++searchIdRef.current;
    setSearchLoading(true);
    try {
      const result = await fetchCatalogProducts({
        q: searchQuery || undefined,
        limit: CATALOG_LIMIT,
      });
      if (requestId !== searchIdRef.current) return;
      if (result?.data) {
        setProducts(result.data);
      } else {
        setProducts(filterClientSide(initialProducts));
      }
    } finally {
      if (requestId === searchIdRef.current) {
        setSearchLoading(false);
      }
    }
  }, [searchQuery, filterClientSide, initialProducts]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => products, [products]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 },
    );
    const node = gridRef.current;
    if (node) observer.observe(node);
    return () => { if (node) observer.unobserve(node); };
  }, []);

  const emptyMessage = searchQuery
    ? `No encontramos productos para «${searchQuery}».`
    : "No hay productos disponibles. Asegúrate de que el backend esté corriendo.";

  return (
    <div className="pt-28 pb-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-sm tracking-[0.3em] uppercase text-primary mb-4 block">
            Colección
          </span>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground mb-4 text-balance">
            Nuestra colección
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Sudaderas, gorras, tenis y más. Precios en MXN con IVA.
          </p>
        </div>

        <div className="mb-10">
          <label htmlFor="shop-search" className="sr-only">
            Buscar productos
          </label>
          <div className="relative max-w-xl mx-auto">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
              aria-hidden
            />
            <input
              id="shop-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nombre o descripción…"
              autoComplete="off"
              aria-describedby="shop-search-hint"
              className={cn(
                "w-full pl-11 pr-10 py-3 rounded-2xl glass bg-transparent text-foreground placeholder:text-muted-foreground",
                "outline-none focus:ring-2 focus:ring-primary/30 boty-transition",
              )}
            />
            {searchInput.length > 0 && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded-full"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <p id="shop-search-hint" className="sr-only">
            Los resultados se actualizan al escribir.
          </p>
        </div>

        {filteredProducts.length === 0 && !searchLoading ? (
          <div className="text-center py-16 bg-card rounded-3xl boty-shadow">
            <p className="text-muted-foreground">{emptyMessage}</p>
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
