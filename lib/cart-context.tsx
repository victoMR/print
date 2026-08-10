"use client";

import type { CartItem } from "@/lib/api-types";
import { syncCartWithCatalog } from "@/lib/api";
import { clampCartLineQuantity, MAX_CART_LINE_QUANTITY } from "@/lib/cart-limits";
import { currencyForMarket, priceForCurrency, type OrderCurrency } from "@/lib/i18n/currency";
import type { Locale } from "@/lib/i18n/locale";
import { useLocale } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "mrpaps-cart-v4";

type StoredCart = {
  market: Locale;
  items: CartItem[];
};

type CartContextValue = {
  items: CartItem[];
  /** Items con stock (para conteo y subtotal). */
  inStockItems: CartItem[];
  /** Items marcados como agotados por el último sync. */
  outOfStockItems: CartItem[];
  count: number;
  itemCount: number;
  /** Moneda vigente, derivada del mercado actual (/mx → MXN, /us → USD). */
  currency: OrderCurrency;
  /** Mercado del path actual. */
  market: Locale;
  /** Precio de un item en la moneda vigente; null si no está disponible en esa moneda. */
  itemPrice: (item: Pick<CartItem, "retailPriceMxn" | "retailPriceUsd">) => string | null;
  subtotal: number;
  hydrated: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addItem: (
    item: Omit<CartItem, "quantity">,
    quantity?: number,
    options?: { openDrawer?: boolean },
  ) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  /** Re-sincroniza el carrito contra el catálogo (actualiza stock). */
  syncCart: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

function lineMax(item: Pick<CartItem, "maxQuantity">): number {
  return item.maxQuantity ?? MAX_CART_LINE_QUANTITY;
}

function sanitizeStoredItem(raw: unknown): CartItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<CartItem>;
  if (typeof item.variantId !== "string" || !item.variantId) return null;
  if (typeof item.productSlug !== "string" || typeof item.productName !== "string") {
    return null;
  }
  if (typeof item.variantLabel !== "string" || typeof item.retailPriceMxn !== "string") {
    return null;
  }
  if (typeof item.thumbnail !== "string") return null;

  const maxQuantity =
    typeof item.maxQuantity === "number" && item.maxQuantity > 0
      ? Math.min(item.maxQuantity, MAX_CART_LINE_QUANTITY)
      : MAX_CART_LINE_QUANTITY;

  return {
    variantId: item.variantId,
    productSlug: item.productSlug,
    productName: item.productName,
    variantLabel: item.variantLabel,
    retailPriceMxn: item.retailPriceMxn,
    retailPriceUsd: typeof item.retailPriceUsd === "string" ? item.retailPriceUsd : null,
    thumbnail: item.thumbnail,
    maxQuantity,
    quantity: clampCartLineQuantity(item.quantity ?? 1, maxQuantity),
  };
}

function loadStoredCart(currentMarket: Locale): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Migrate v3 (flat array, no market) once.
      const legacy = localStorage.getItem("mrpaps-cart-v3");
      if (!legacy) return [];
      const parsed = JSON.parse(legacy) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.map(sanitizeStoredItem).filter((i): i is CartItem => i !== null);
    }
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map(sanitizeStoredItem).filter((i): i is CartItem => i !== null);
    }
    if (!parsed || typeof parsed !== "object") return [];
    const stored = parsed as Partial<StoredCart>;
    const items = Array.isArray(stored.items)
      ? stored.items.map(sanitizeStoredItem).filter((i): i is CartItem => i !== null)
      : [];
    // Same dual-price lines work in both markets; keep items when switching MX↔US.
    void currentMarket;
    return items;
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const market = useLocale() as Locale;
  const currency = currencyForMarket(market);
  const marketRef = useRef(market);
  marketRef.current = market;

  const itemPrice = useCallback(
    (item: Pick<CartItem, "retailPriceMxn" | "retailPriceUsd">) => priceForCurrency(item, currency),
    [currency],
  );

  const runSync = useCallback(async (stored: CartItem[]): Promise<CartItem[]> => {
    const synced = await syncCartWithCatalog(
      stored.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      marketRef.current,
    );
    return synced;
  }, []);

  useEffect(() => {
    const stored = loadStoredCart(market);
    if (stored.length === 0) {
      setItems([]);
      setHydrated(true);
      return;
    }

    void runSync(stored)
      .then((synced) => setItems(synced))
      .catch(() => setItems(stored))
      .finally(() => setHydrated(true));
    // Hydrate once on mount — market changes only switch which price field is shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only hydrate
  }, [runSync]);

  // Persistir items + mercado actual (moneda se deriva del path en runtime).
  useEffect(() => {
    if (!hydrated) return;
    const payload: StoredCart = {
      market: marketRef.current,
      items: items.filter((i) => !i.outOfStock),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [items, hydrated, market]);

  const syncCart = useCallback(async () => {
    setItems((prev) => {
      void runSync(prev.filter((i) => !i.outOfStock))
        .then((synced) => setItems(synced))
        .catch(() => {/* mantener estado */});
      return prev;
    });
  }, [runSync]);

  const addItem = useCallback(
    (
      item: Omit<CartItem, "quantity">,
      quantity = 1,
      options?: { openDrawer?: boolean },
    ) => {
      setItems((prev) => {
        const max = lineMax(item);
        const existing = prev.find((i) => i.variantId === item.variantId);
        if (existing) {
          return prev.map((i) =>
            i.variantId === item.variantId
              ? {
                  ...i,
                  ...item,
                  quantity: clampCartLineQuantity(i.quantity + quantity, max),
                  maxQuantity: max,
                  outOfStock: false,
                }
              : i,
          );
        }
        return [
          ...prev,
          {
            ...item,
            maxQuantity: max,
            quantity: clampCartLineQuantity(quantity, max),
            outOfStock: false,
          },
        ];
      });
      if (options?.openDrawer !== false) {
        setIsOpen(true);
      }
    },
    [],
  );

  const removeItem = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    setItems((prev) => {
      const current = prev.find((i) => i.variantId === variantId);
      if (!current) return prev;
      const max = lineMax(current);
      if (quantity < 1) {
        return prev.filter((i) => i.variantId !== variantId);
      }
      const next = clampCartLineQuantity(quantity, max);
      return prev.map((i) =>
        i.variantId === variantId ? { ...i, quantity: next } : i,
      );
    });
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const inStockItems = useMemo(() => items.filter((i) => !i.outOfStock), [items]);
  const outOfStockItems = useMemo(() => items.filter((i) => i.outOfStock), [items]);

  const count = useMemo(
    () => inStockItems.reduce((sum, item) => sum + item.quantity, 0),
    [inStockItems],
  );

  const subtotal = useMemo(
    () =>
      inStockItems.reduce((sum, item) => {
        const price = itemPrice(item);
        return price ? sum + Number.parseFloat(price) * item.quantity : sum;
      }, 0),
    [inStockItems, itemPrice],
  );

  const value = useMemo(
    () => ({
      items,
      inStockItems,
      outOfStockItems,
      count,
      itemCount: count,
      currency,
      market,
      itemPrice,
      subtotal,
      hydrated,
      isOpen,
      setIsOpen,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      syncCart,
    }),
    [
      items,
      inStockItems,
      outOfStockItems,
      count,
      currency,
      market,
      itemPrice,
      subtotal,
      hydrated,
      isOpen,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      syncCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart debe usarse dentro de CartProvider");
  }
  return ctx;
}
