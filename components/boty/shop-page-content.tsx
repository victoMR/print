"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import type { CatalogProductSummary } from "@/lib/api-types";
import { fetchCatalogProducts } from "@/lib/api";
import { currencyForMarket } from "@/lib/i18n/currency";
import type { Locale } from "@/lib/i18n/locale";
import { CatalogProductCard } from "./catalog-product-card";

type ShopPageContentProps = {
  products: CatalogProductSummary[];
};

const CATALOG_LIMIT = 48;
const SEARCH_DEBOUNCE_MS = 300;

export function ShopPageContent({ products: initialProducts }: ShopPageContentProps) {
  const t = useTranslations("shop.page");
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

  const market = useLocale() as Locale;
  const currency = currencyForMarket(market);

  // En USD solo se listan productos con precio en USD ya definido — evita
  // mostrar precio $0 o bloquear el carrito por un producto no disponible.
  const filteredProducts = useMemo(
    () => (currency === "USD" ? products.filter((p) => p.priceFromUsd !== null) : products),
    [products, currency],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.05 },
    );
    const node = gridRef.current;
    if (node) observer.observe(node);
    return () => {
      if (node) observer.unobserve(node);
    };
  }, []);

  const emptyMessage = searchQuery
    ? t("noResultsFor", { query: searchQuery })
    : t("noProducts");

  return (
    <div className="pt-[100px]">
      {/* Page header */}
      <div className="border-b border-[#D4CFC5] bg-[#F5F0E6]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl tracking-[0.08em] uppercase text-[#2A2726]">
            {t("title")}
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Search + sort bar */}
        <div className="flex items-center justify-between py-5 border-b border-[#D4CFC5]">
          <div className="flex items-center gap-3">
            <label htmlFor="shop-search" className="text-[11px] tracking-[0.18em] uppercase text-[#7A756E]">
              {t("filter")}
            </label>
          </div>

          <div className="flex items-center gap-6">
            {/* Search */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7A756E] pointer-events-none"
                aria-hidden
              />
              <input
                id="shop-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t("searchPlaceholder")}
                autoComplete="off"
                className="pl-9 pr-8 py-2 text-[11px] tracking-[0.1em] bg-transparent border border-[#D4CFC5] text-[#2A2726] placeholder:text-[#7A756E] outline-none focus:border-[#2A2726] boty-transition w-48"
              />
              {searchInput.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7A756E] hover:text-[#2A2726]"
                  aria-label={t("clearSearch")}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <span className="text-[11px] tracking-[0.18em] uppercase text-[#7A756E]">
              {t("sortBy")}
            </span>
          </div>
        </div>

        {/* Product grid */}
        <div className="py-10">
          {filteredProducts.length === 0 && !searchLoading ? (
            <div className="text-center py-20 border border-[#D4CFC5]">
              <p className="text-[12px] tracking-[0.15em] uppercase text-[#7A756E]">{emptyMessage}</p>
            </div>
          ) : (
            <div
              ref={gridRef}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12"
            >
              {filteredProducts.map((product, index) => (
                <CatalogProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  isVisible={isVisible}
                  showQuickAdd={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
