"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { CatalogProductSummary } from "@/lib/api-types";
import type { ProductCategory } from "@/lib/product-categories";
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS } from "@/lib/product-categories";
import { fetchCatalogProducts } from "@/lib/api";
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

const CATALOG_LIMIT = 48;
const SEARCH_DEBOUNCE_MS = 300;

/** Página Shop — productos del API con filtro por categoría y búsqueda. */
export function ShopPageContent({ products: initialProducts }: ShopPageContentProps) {
  const searchParams = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<FilterValue>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState(initialProducts);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchIdRef = useRef(0);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    const cat = searchParams.get("category");
    if (
      cat &&
      PRODUCT_CATEGORIES.some((c) => c.value === cat)
    ) {
      setSelectedCategory(cat as ProductCategory);
    }
  }, [searchParams]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const filterClientSide = useCallback(
    (source: CatalogProductSummary[]) => {
      let list = source;
      if (selectedCategory !== "all") {
        list = list.filter((p) => (p.category ?? "camiseta") === selectedCategory);
      }
      if (searchQuery) {
        const term = searchQuery.toLowerCase();
        list = list.filter(
          (p) =>
            p.name.toLowerCase().includes(term) || p.slug.toLowerCase().includes(term),
        );
      }
      return list;
    },
    [selectedCategory, searchQuery],
  );

  const loadProducts = useCallback(async () => {
    const requestId = ++searchIdRef.current;
    setSearchLoading(true);
    try {
      const category = selectedCategory === "all" ? undefined : selectedCategory;
      const result = await fetchCatalogProducts({
        category,
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
  }, [selectedCategory, searchQuery, filterClientSide, initialProducts]);

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

    return () => {
      if (node) observer.unobserve(node);
    };
  }, []);

  function selectCategory(value: FilterValue) {
    setSelectedCategory(value);
    setShowFilters(false);
  }

  const emptyMessage = useMemo(() => {
    if (products.length === 0 && !searchQuery && selectedCategory === "all") {
      return "No hay productos disponibles. Asegúrate de que el backend esté corriendo.";
    }
    if (searchQuery) {
      return `No encontramos productos para «${searchQuery}».`;
    }
    if (selectedCategory !== "all") {
      return `No hay productos en ${PRODUCT_CATEGORY_LABELS[selectedCategory]}.`;
    }
    return "No hay productos que coincidan con tu búsqueda.";
  }, [products.length, searchQuery, selectedCategory]);

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

        <div className="mb-8">
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

          <span className="text-sm text-muted-foreground" aria-live="polite" aria-busy={searchLoading}>
            {searchLoading ? "Buscando…" : (
              <>
                {filteredProducts.length}{" "}
                {filteredProducts.length === 1 ? "producto" : "productos"}
                {selectedCategory !== "all" && (
                  <span className="hidden sm:inline">
                    {" "}
                    · {PRODUCT_CATEGORY_LABELS[selectedCategory]}
                  </span>
                )}
              </>
            )}
          </span>
        </div>

        {showFilters && (
          <div className="lg:hidden fixed inset-0 z-50 bg-background safe-top safe-bottom">
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
