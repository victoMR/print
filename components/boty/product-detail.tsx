"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, Minus, Plus, Check, ChevronDown } from "lucide-react";
import type { CatalogProductDetail } from "@/lib/api-types";
import { ProductMockupPreview } from "@/components/boty/product-mockup-preview";
import { ProductGallery } from "@/components/boty/product-gallery";
import { useCart } from "@/lib/cart-context";
import { clampCartLineQuantity, MAX_CART_LINE_QUANTITY } from "@/lib/cart-limits";
import { formatCurrency } from "@/lib/utils";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { localizedProductDescription, localizedProductName } from "@/lib/i18n/product-content";
import { currencyForMarket, priceForCurrency } from "@/lib/i18n/currency";
import type { Locale } from "@/lib/i18n/locale";
import { useLanguage } from "@/lib/i18n/language-context";

type ProductDetailProps = {
  product: CatalogProductDetail;
};

function normalizeColorKey(color: string): string {
  return color.toLowerCase().trim();
}

function colorsMatch(a: string, b: string): boolean {
  return normalizeColorKey(a) === normalizeColorKey(b);
}

// Default hex colors for common Spanish color names used as swatches
const COLOR_HEX_DEFAULTS: Record<string, string> = {
  "blanco":        "#F8F5EF",
  "blanco puro":   "#FFFFFF",
  "negro":         "#1C1B1A",
  "gris":          "#8E8A85",
  "gris claro":    "#C2BFBA",
  "gris obscuro":  "#3D3B38",
  "gris oscuro":   "#3D3B38",
  "borgoña":       "#5C1A24",
  "verde":         "#2A5C3F",
  "verde obscuro": "#1E4030",
  "azul":          "#2C5F8A",
  "azul marino":   "#1B2E4B",
  "marino":        "#1B2E4B",
  "beige":         "#D4C5A9",
  "arena":         "#C9B99A",
  "crema":         "#F5F0E6",
  "café":          "#6B4226",
  "rojo":          "#C0392B",
  "naranja":       "#D4622A",
  "amarillo":      "#D4A020",
  "morado":        "#6B3580",
  "rosa":          "#D4607A",
};

type AccordionSection = {
  title: string;
  content: string;
};

function AccordionItem({ title, content }: AccordionSection) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-[#D4CFC5]">
      <button
        type="button"
        className="w-full flex items-center justify-between py-4 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-[11px] tracking-[0.22em] uppercase font-sans text-[#2A2726]">
          {title}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#7A756E] boty-transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`overflow-hidden boty-transition ${open ? "max-h-48 pb-4" : "max-h-0"}`}
      >
        <p className="text-[12px] leading-relaxed text-[#7A756E] tracking-[0.05em]">
          {content}
        </p>
      </div>
    </div>
  );
}

export function ProductDetail({ product }: ProductDetailProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const [isAdded, setIsAdded] = useState(false);
  const market = useLocale() as Locale;
  const language = useLanguage();
  const t = useTranslations("shop.productDetail");
  const name = localizedProductName(product, language);
  const description = localizedProductDescription(product, language);
  const currency = currencyForMarket(market);

  const accordionSections: AccordionSection[] = [
    { title: t("detailsTitle"), content: t("detailsContent") },
    { title: t("shippingTitle"), content: t("shippingContent") },
    { title: t("careTitle"), content: t("careContent") },
  ];

  const colorImageByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const ci of product.colorImages ?? []) {
      const url = normalizeAssetUrl(ci.imageUrl);
      if (url) map.set(normalizeColorKey(ci.color), url);
    }
    return map;
  }, [product.colorImages]);

  const hasColorImages = colorImageByKey.size > 0;

  const colors = useMemo(() => {
    const fromImages = (product.colorImages ?? [])
      .map((ci) => ci.color)
      .filter((c) => product.variants.some((v) => colorsMatch(v.color, c)));
    if (fromImages.length > 0) return fromImages;
    return [...new Set(product.variants.map((v) => v.color))];
  }, [product]);

  const allSizes = useMemo(
    () => [...new Set(product.variants.map((v) => v.size))],
    [product.variants],
  );

  const initialVariantId = useMemo(() => {
    const firstColor = colors[0];
    const v =
      product.variants.find((v) => colorsMatch(v.color, firstColor) && v.inStock) ??
      product.variants.find((v) => colorsMatch(v.color, firstColor)) ??
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

  function variantExists(size: string, color: string) {
    return product.variants.some((v) => v.size === size && colorsMatch(v.color, color));
  }

  function isInStock(size: string, color: string) {
    return product.variants.find((v) => v.size === size && colorsMatch(v.color, color))?.inStock ?? false;
  }

  function isColorAvailable(color: string) {
    return product.variants.some((v) => colorsMatch(v.color, color) && v.inStock);
  }

  function findVariant(color: string, size?: string, preferInStock = false) {
    const matches = product.variants.filter((v) => colorsMatch(v.color, color));
    if (matches.length === 0) return undefined;
    if (size) {
      const withSize = matches.filter((v) => v.size === size);
      if (withSize.length > 0) {
        return withSize.find((v) => v.inStock) ?? withSize[0];
      }
    }
    if (preferInStock) {
      return matches.find((v) => v.inStock) ?? matches[0];
    }
    return matches[0];
  }

  function pickColor(color: string) {
    const next = findVariant(color, selected?.size, true);
    if (next) setVariantId(next.variantId);
  }

  function pickSize(size: string) {
    const color = selected?.color ?? colors[0] ?? "";
    const next =
      findVariant(color, size, true) ??
      product.variants.find((v) => v.size === size && v.inStock) ??
      product.variants.find((v) => v.size === size);
    if (next) setVariantId(next.variantId);
  }

  const selectedColorImageUrl = useMemo(() => {
    if (!selected?.color) return null;
    for (const ci of product.colorImages ?? []) {
      if (colorsMatch(ci.color, selected.color)) {
        return normalizeAssetUrl(ci.imageUrl) || null;
      }
    }
    return colorImageByKey.get(normalizeColorKey(selected.color)) ?? null;
  }, [selected?.color, product.colorImages, colorImageByKey]);

  const displayImages = useMemo(() => {
    // Color-specific image takes priority
    if (selectedColorImageUrl) return [selectedColorImageUrl];

    // No URL for selected color — show general product images (NOT other colors' images)
    const productImgs = product.images?.length
      ? (product.images.map((url) => normalizeAssetUrl(url)).filter(Boolean) as string[])
      : ([normalizeAssetUrl(product.thumbnail)].filter(Boolean) as string[]);

    if (productImgs.length) return productImgs;

    // Last resort: any color image
    return [...colorImageByKey.values()];
  }, [selectedColorImageUrl, product.images, product.thumbnail, colorImageByKey]);

  const selectedPrice = selected ? priceForCurrency(selected, currency) : null;

  function addSelectedToCart(openDrawer = true) {
    if (!selected || selectedPrice === null) return false;
    addItem(
      {
        variantId: selected.variantId,
        productSlug: product.slug,
        productName: name,
        variantLabel: `${selected.size} / ${selected.color}`,
        retailPriceMxn: selected.retailPriceMxn,
        retailPriceUsd: selected.retailPriceUsd,
        thumbnail: selectedColorImageUrl ?? product.thumbnail,
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

  const canBuy = !!selected && selected.inStock && selectedPrice !== null;

  return (
    <div className="pt-[100px] pb-20 bg-[#F5F0E6]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="py-4 border-b border-[#D4CFC5] mb-10">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.15em] uppercase text-[#7A756E] hover:text-[#2A2726] boty-transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {t("backToShop")}
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Gallery */}
          <div>
            {product.preview && !hasColorImages ? (
              <div className="relative aspect-[4/5] overflow-hidden bg-[#EBE7DB]">
                <ProductMockupPreview
                  preview={product.preview}
                  fallbackThumbnail={product.thumbnail || "/placeholder.svg"}
                  alt={name}
                  garmentColorOverride={selected?.garmentColorHex}
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </div>
            ) : (
              <ProductGallery
                key={`color:${selected?.color ?? "default"}`}
                images={displayImages}
                alt={name}
                priority
              />
            )}
          </div>

          {/* Product info */}
          <div className="flex flex-col">
            {/* Collection label */}
            <span className="text-[10px] tracking-[0.3em] uppercase text-[#7A756E] mb-3 font-sans block">
              {t("collection")}
            </span>

            {/* Product name */}
            <h1 className="font-serif text-4xl md:text-5xl tracking-[0.06em] uppercase text-[#2A2726] mb-4 leading-tight">
              {name}
            </h1>

            {/* Price */}
            {selected && (
              <div className="flex items-center gap-4 mb-6">
                {selectedPrice !== null ? (
                  <span className="text-2xl font-sans tracking-[0.06em] text-[#2A2726]">
                    {formatCurrency(selectedPrice, currency)}
                  </span>
                ) : (
                  <span className="text-[11px] tracking-[0.15em] uppercase text-destructive">
                    {t("notAvailableInCurrency")}
                  </span>
                )}
                {!selected.inStock && (
                  <span className="text-[11px] tracking-[0.15em] uppercase text-destructive">
                    {t("outOfStock")}
                  </span>
                )}
              </div>
            )}

            {/* Description */}
            {description && (
              <p className="text-[13px] leading-relaxed text-[#7A756E] mb-8 tracking-[0.04em]">
                {description}
              </p>
            )}

            {/* Color selector */}
            {colors.length > 0 && (
              <fieldset className="mb-7 border-0 p-0 m-0">
                <legend className="sr-only">{t("colorLabel")}</legend>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] tracking-[0.2em] uppercase font-sans text-[#2A2726]">
                    {t("colorLabel")}
                  </span>
                  {selected?.color && (
                    <span className="text-[11px] tracking-[0.2em] uppercase font-sans text-[#7A756E]">
                      {selected.color.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {colors.map((color) => {
                    const isSelected = selected?.color ? colorsMatch(selected.color, color) : false;
                    const available = isColorAvailable(color);
                    const rawHex = product.variants.find((v) => colorsMatch(v.color, color))?.garmentColorHex?.trim();
                    // Ignore #FFFFFF — it's the DB default, not a configured swatch color
                    const variantHex = (rawHex && rawHex.toUpperCase() !== "#FFFFFF") ? rawHex : null;
                    const hexColor = variantHex ?? COLOR_HEX_DEFAULTS[normalizeColorKey(color)] ?? null;

                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => available ? pickColor(color) : undefined}
                        disabled={!available}
                        title={!available ? t("colorNotAvailable") : color}
                        className={`relative w-8 h-8 boty-transition border-2 ${
                          isSelected
                            ? "border-[#2A2726]"
                            : available
                              ? "border-transparent hover:border-[#2A2726]/40"
                              : "border-transparent opacity-30 cursor-not-allowed"
                        }`}
                        style={{
                          backgroundColor: hexColor ?? "#D4CFC5",
                          borderRadius: "50%",
                        }}
                        aria-label={color}
                      />
                    );
                  })}
                </div>
              </fieldset>
            )}

            {/* Size selector */}
            {allSizes.length > 0 && (
              <fieldset className="mb-7 border-0 p-0 m-0">
                <legend className="sr-only">{t("size")}</legend>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] tracking-[0.2em] uppercase font-sans text-[#2A2726]">
                    {t("sizeLabel", { size: selected?.size ?? "" })}
                  </span>
                  <button
                    type="button"
                    className="text-[11px] tracking-[0.15em] uppercase text-[#7A756E] underline underline-offset-2 hover:text-[#2A2726] boty-transition"
                  >
                    {t("sizeGuide")}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
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
                        className={`relative w-14 h-11 text-[11px] tracking-[0.15em] uppercase font-sans boty-transition border ${
                          isSelected
                            ? "bg-[#2A2726] text-[#f8f9fa] border-[#2A2726]"
                            : !exists
                              ? "border-[#D4CFC5] text-[#D4CFC5] cursor-not-allowed"
                              : !inStock
                                ? "border-[#D4CFC5] text-[#D4CFC5]/60 cursor-not-allowed"
                                : "border-[#D4CFC5] text-[#2A2726] hover:border-[#2A2726]"
                        }`}
                      >
                        {size}
                        {exists && !inStock && (
                          <span className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                            <span className="block w-3/4 border-t border-current opacity-40 rotate-[-35deg]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {/* Quantity */}
            <div className="mb-8">
              <span className="text-[11px] tracking-[0.2em] uppercase font-sans text-[#2A2726] mb-3 block">
                {t("quantity")}
              </span>
              <div className="inline-flex items-center border border-[#D4CFC5]">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center text-[#7A756E] hover:text-[#2A2726] boty-transition border-r border-[#D4CFC5]"
                  aria-label={t("decreaseQuantity")}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-12 text-center text-[13px] font-sans text-[#2A2726]">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(clampCartLineQuantity(quantity + 1, maxQuantity))}
                  disabled={quantity >= maxQuantity}
                  className="w-10 h-10 flex items-center justify-center text-[#7A756E] hover:text-[#2A2726] boty-transition border-l border-[#D4CFC5] disabled:opacity-40"
                  aria-label={t("increaseQuantity")}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col gap-3 mb-8">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!canBuy}
                className={`w-full py-4 text-[11px] tracking-[0.25em] uppercase font-sans boty-transition disabled:opacity-50 ${
                  isAdded
                    ? "bg-[#1E5A43] text-[#f8f9fa]"
                    : "bg-[#5C1A24] text-[#f8f9fa] hover:bg-[#4A1520]"
                }`}
              >
                {isAdded ? (
                  <span className="flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    {t("addedToCart")}
                  </span>
                ) : (
                  t("addToCart")
                )}
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={!canBuy}
                className="w-full py-4 text-[11px] tracking-[0.25em] uppercase font-sans border border-[#2A2726] text-[#2A2726] hover:bg-[#2A2726] hover:text-[#f8f9fa] boty-transition disabled:opacity-50"
              >
                {t("buyNow")}
              </button>
            </div>

            <p className="text-[11px] tracking-[0.08em] text-[#7A756E] mb-10">
              {t("shippingNote")}
            </p>

            {/* Accordion */}
            <div>
              {accordionSections.map((section) => (
                <AccordionItem key={section.title} {...section} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
