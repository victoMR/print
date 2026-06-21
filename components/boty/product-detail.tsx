"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Minus, Plus, Check } from "lucide-react";
import type { CatalogProductDetail } from "@/lib/api-types";
import { ProductMockupPreview } from "@/components/boty/product-mockup-preview";
import { ProductGallery } from "@/components/boty/product-gallery";
import { useCart } from "@/lib/cart-context";
import { clampCartLineQuantity, MAX_CART_LINE_QUANTITY } from "@/lib/cart-limits";
import { formatMxn } from "@/lib/utils";
import { normalizeAssetUrl } from "@/lib/asset-url";

type ProductDetailProps = {
  product: CatalogProductDetail;
};

export function ProductDetail({ product }: ProductDetailProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const [isAdded, setIsAdded] = useState(false);

  // ── Colores ordenados según colorImages (si existen), si no, desde variantes ──
  const colors = useMemo(() => {
    const fromImages = (product.colorImages ?? [])
      .map((ci) => ci.color)
      .filter((c) =>
        product.variants.some((v) => v.color.toLowerCase() === c.toLowerCase()),
      );
    if (fromImages.length > 0) return fromImages;
    return [...new Set(product.variants.map((v) => v.color))];
  }, [product]);

  // ── Tallas únicas preservando el orden que vienen del backend ───────────────
  const allSizes = useMemo(
    () => [...new Set(product.variants.map((v) => v.size))],
    [product.variants],
  );

  // ── Selección inicial: primer color disponible → mejor talla disponible ─────
  const initialVariantId = useMemo(() => {
    const firstColor = colors[0];
    const v =
      product.variants.find((v) => v.color === firstColor && v.inStock) ??
      product.variants.find((v) => v.color === firstColor) ??
      product.variants.find((v) => v.inStock) ??
      product.variants[0];
    return v?.variantId;
  }, [colors, product.variants]);

  const [variantId, setVariantId] = useState(initialVariantId);

  const selected = useMemo(
    () => product.variants.find((v) => v.variantId === variantId),
    [product.variants, variantId],
  );

  const maxQuantity = selected?.maxQuantity ?? MAX_CART_LINE_QUANTITY;
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [product.slug]);

  useEffect(() => {
    setQuantity((q) => clampCartLineQuantity(q, maxQuantity));
  }, [maxQuantity, variantId]);

  // ── Helpers de disponibilidad ────────────────────────────────────────────────

  /** ¿Existe la combinación talla+color como variante activa? */
  function variantExists(size: string, color: string) {
    return product.variants.some((v) => v.size === size && v.color === color);
  }

  /** ¿Tiene stock la combinación talla+color? */
  function isInStock(size: string, color: string) {
    return product.variants.find((v) => v.size === size && v.color === color)?.inStock ?? false;
  }

  /** ¿El color tiene al menos una talla con stock? */
  function isColorAvailable(color: string) {
    return product.variants.some((v) => v.color === color && v.inStock);
  }

  // ── Selección interactiva ────────────────────────────────────────────────────

  function pickColor(color: string) {
    const currentSize = selected?.size;
    // Intentar mantener la talla actual; si no, la primera talla con stock; si no, cualquiera
    const next =
      (currentSize && product.variants.find((v) => v.color === color && v.size === currentSize && v.inStock)) ??
      (currentSize && product.variants.find((v) => v.color === color && v.size === currentSize)) ??
      product.variants.find((v) => v.color === color && v.inStock) ??
      product.variants.find((v) => v.color === color);
    if (next) setVariantId(next.variantId);
  }

  function pickSize(size: string) {
    const currentColor = selected?.color;
    const next =
      (currentColor && product.variants.find((v) => v.size === size && v.color === currentColor && v.inStock)) ??
      (currentColor && product.variants.find((v) => v.size === size && v.color === currentColor)) ??
      product.variants.find((v) => v.size === size && v.inStock) ??
      product.variants.find((v) => v.size === size);
    if (next) setVariantId(next.variantId);
  }

  // ── Galería ──────────────────────────────────────────────────────────────────

  const hasColorImages = (product.colorImages?.length ?? 0) > 0;
  const selectedColorImage = selected?.color
    ? (product.colorImages?.find(
        (ci) => ci.color.toLowerCase() === selected.color.toLowerCase(),
      )?.imageUrl ?? null)
    : (product.colorImages?.[0]?.imageUrl ?? null);

  const displayImages = hasColorImages
    ? (selectedColorImage
        ? [normalizeAssetUrl(selectedColorImage)]
        : (product.colorImages?.map((ci) => normalizeAssetUrl(ci.imageUrl)).filter(Boolean) ?? []))
    : (product.images?.length
        ? product.images.map((url) => normalizeAssetUrl(url)).filter(Boolean)
        : [normalizeAssetUrl(product.thumbnail)].filter(Boolean));

  // ── Carrito ──────────────────────────────────────────────────────────────────

  function addSelectedToCart(openDrawer = true) {
    if (!selected) return false;
    addItem(
      {
        variantId: selected.variantId,
        productSlug: product.slug,
        productName: product.name,
        variantLabel: `${selected.size} / ${selected.color}`,
        retailPriceMxn: selected.retailPriceMxn,
        thumbnail: selectedColorImage ?? product.thumbnail,
        maxQuantity,
      },
      quantity,
      { openDrawer },
    );
    return true;
  }

  function handleAddToCart() {
    if (!addSelectedToCart(true)) return;
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  }

  function handleBuyNow() {
    if (!addSelectedToCart(false)) return;
    router.push("/checkout");
  }

  const canBuy = !!selected && selected.inStock;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="pt-28 pb-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground boty-transition mb-8"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver a la tienda
        </Link>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
          {/* ── Imagen ────────────────────────────────────────────────────────── */}
          <div>
            {product.preview && !hasColorImages ? (
              <div className="relative aspect-square rounded-3xl overflow-hidden bg-card boty-shadow">
                <ProductMockupPreview
                  preview={product.preview}
                  fallbackThumbnail={product.thumbnail || "/placeholder.svg"}
                  alt={product.name}
                  garmentColorOverride={selected?.garmentColorHex}
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </div>
            ) : (
              <ProductGallery key={selected?.color ?? "default"} images={displayImages} alt={product.name} priority />
            )}
          </div>

          {/* ── Info + selectores ──────────────────────────────────────────────── */}
          <div className="flex flex-col">
            {/* Nombre y descripción */}
            <div className="mb-8">
              <span className="text-sm tracking-[0.3em] uppercase text-primary mb-2 block">
                Mr. Paps
              </span>
              <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-3">
                {product.name}
              </h1>
              <p className="text-foreground/80 leading-relaxed">{product.description}</p>
            </div>

            {/* Precio */}
            {selected && (
              <div className="flex items-baseline gap-3 mb-8">
                <span className="text-3xl font-medium text-foreground">
                  {formatMxn(selected.retailPriceMxn)}
                </span>
                {!selected.inStock && (
                  <span className="text-sm text-destructive font-medium">Agotado</span>
                )}
              </div>
            )}

            {/* ── Selector de color ─────────────────────────────────────────── */}
            {colors.length > 0 && (
              <div className="mb-7">
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-sm font-medium text-foreground">Color</span>
                  {selected?.color && (
                    <span className="text-sm text-muted-foreground">— {selected.color}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {colors.map((color) => {
                    const isSelected = selected?.color === color;
                    const available = isColorAvailable(color);

                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => pickColor(color)}
                        className={`relative px-3.5 py-2 rounded-full text-xs font-medium boty-transition
                          ${isSelected
                            ? "bg-primary text-primary-foreground shadow-md"
                            : available
                              ? "bg-card border border-border/60 text-foreground hover:border-primary/60 hover:bg-primary/5 boty-shadow"
                              : "bg-muted/40 border border-dashed border-border/40 text-foreground/35 cursor-not-allowed"}
                        `}
                        disabled={!available}
                        title={!available ? "Sin stock en este color" : undefined}
                      >
                        {color}
                        {!available && (
                          <span className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-full overflow-hidden">
                            <span className="block w-3/4 border-t border-current opacity-40 rotate-[-20deg]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Selector de talla ──────────────────────────────────────────── */}
            {allSizes.length > 0 && (
              <div className="mb-7">
                <span className="text-sm font-medium text-foreground mb-4 block">Talla</span>
                <div className="flex flex-wrap gap-2.5">
                  {allSizes.map((size) => {
                    const color = selected?.color ?? colors[0] ?? "";
                    const exists = variantExists(size, color);
                    const inStock = exists && isInStock(size, color);
                    const isSelected = selected?.size === size;

                    return (
                      <button
                        key={size}
                        type="button"
                        disabled={!exists}
                        onClick={() => exists ? pickSize(size) : undefined}
                        title={
                          !exists ? `No disponible en ${color}` :
                          !inStock ? "Agotado" : undefined
                        }
                        className={`relative w-14 h-14 rounded-2xl text-sm font-medium boty-transition
                          ${isSelected
                            ? "bg-primary text-primary-foreground shadow-md"
                            : !exists
                              ? "bg-muted/30 text-foreground/25 cursor-not-allowed border border-dashed border-border/30"
                              : !inStock
                                ? "bg-card text-foreground/40 border border-border/40 cursor-not-allowed"
                                : "bg-card text-foreground border border-border/60 hover:border-primary/60 hover:bg-primary/5 boty-shadow"}
                        `}
                      >
                        {size}
                        {exists && !inStock && (
                          <span className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-2xl overflow-hidden">
                            <span className="block w-3/4 border-t border-current opacity-50 rotate-[-35deg]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Cantidad ───────────────────────────────────────────────────── */}
            <div className="mb-8">
              <span className="text-sm font-medium text-foreground mb-3 block">Cantidad</span>
              <div className="inline-flex items-center gap-4 bg-card rounded-full px-2 py-2 boty-shadow">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-foreground/60 hover:text-foreground boty-transition"
                  aria-label="Disminuir cantidad"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-medium text-foreground">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(clampCartLineQuantity(quantity + 1, maxQuantity))}
                  disabled={quantity >= maxQuantity}
                  className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-foreground/60 hover:text-foreground boty-transition disabled:opacity-40"
                  aria-label="Aumentar cantidad"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Botones CTA ────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!canBuy}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full text-sm tracking-wide boty-transition boty-shadow disabled:opacity-50
                  ${isAdded
                    ? "bg-primary/80 text-primary-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
              >
                {isAdded ? (
                  <>
                    <Check className="w-4 h-4" />
                    Agregado al carrito
                  </>
                ) : (
                  "Agregar al carrito"
                )}
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={!canBuy}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-transparent border border-foreground/20 text-foreground px-8 py-4 rounded-full text-sm tracking-wide boty-transition hover:bg-foreground/5 disabled:opacity-50"
              >
                Comprar ahora
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Envío estimado 5–14 días · Aduana incluida para México · IVA incluido
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
