"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Minus, Plus, Check } from "lucide-react";
import type { CatalogProductDetail } from "@/lib/api-types";
import { useCart } from "@/lib/cart-context";
import { formatMxn } from "@/lib/utils";

type ProductDetailProps = {
  product: CatalogProductDetail;
};

export function ProductDetail({ product }: ProductDetailProps) {
  const { addItem } = useCart();
  const [variantId, setVariantId] = useState(product.variants[0]?.syncVariantId);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  const selected = useMemo(
    () => product.variants.find((v) => v.syncVariantId === variantId),
    [product.variants, variantId],
  );

  const sizes = [...new Set(product.variants.map((v) => v.size))];
  const colors = [...new Set(product.variants.map((v) => v.color))];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [product.slug]);

  function pickVariant(size: string, color: string) {
    const match =
      product.variants.find((v) => v.size === size && v.color === color) ??
      product.variants.find((v) => v.size === size) ??
      product.variants.find((v) => v.color === color);
    if (match) setVariantId(match.syncVariantId);
  }

  function handleAddToCart() {
    if (!selected) return;
    addItem(
      {
        syncVariantId: selected.syncVariantId,
        productSlug: product.slug,
        productName: product.name,
        variantLabel: `${selected.size} / ${selected.color}`,
        retailPriceMxn: selected.retailPriceMxn,
        thumbnail: product.thumbnail,
      },
      quantity,
    );
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  }

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
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-card boty-shadow">
            <Image
              src={product.thumbnail || "/placeholder.svg"}
              alt={product.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          <div className="flex flex-col">
            <div className="mb-8">
              <span className="text-sm tracking-[0.3em] uppercase text-primary mb-2 block">
                Print MX
              </span>
              <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-3">
                {product.name}
              </h1>
              <p className="text-foreground/80 leading-relaxed">{product.description}</p>
            </div>

            {selected && (
              <div className="flex items-center gap-3 mb-8">
                <span className="text-3xl font-medium text-foreground">
                  {formatMxn(selected.retailPriceMxn)}
                </span>
                {!selected.inStock && (
                  <span className="text-sm text-destructive">Agotado</span>
                )}
              </div>
            )}

            {sizes.length > 0 && (
              <div className="mb-6">
                <label className="text-sm font-medium text-foreground mb-3 block">
                  Talla
                </label>
                <div className="flex flex-wrap gap-3">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => pickVariant(size, selected?.color ?? colors[0] ?? "")}
                      className={`px-6 py-3 rounded-full text-sm boty-transition boty-shadow ${
                        selected?.size === size
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-foreground hover:bg-card/80"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {colors.length > 0 && colors.some((c) => c) && (
              <div className="mb-6">
                <label className="text-sm font-medium text-foreground mb-3 block">
                  Color
                </label>
                <div className="flex flex-wrap gap-3">
                  {colors.filter(Boolean).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => pickVariant(selected?.size ?? sizes[0] ?? "", color)}
                      className={`px-6 py-3 rounded-full text-sm boty-transition boty-shadow ${
                        selected?.color === color
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-foreground hover:bg-card/80"
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-8">
              <label className="text-sm font-medium text-foreground mb-3 block">
                Cantidad
              </label>
              <div className="inline-flex items-center gap-4 bg-card rounded-full px-2 py-2 boty-shadow">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-foreground/60 hover:text-foreground boty-transition"
                  aria-label="Disminuir cantidad"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-medium text-foreground">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-foreground/60 hover:text-foreground boty-transition"
                  aria-label="Aumentar cantidad"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!selected?.inStock}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full text-sm tracking-wide boty-transition boty-shadow disabled:opacity-50 ${
                  isAdded
                    ? "bg-primary/80 text-primary-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
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
              <Link
                href="/checkout"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-transparent border border-foreground/20 text-foreground px-8 py-4 rounded-full text-sm tracking-wide boty-transition hover:bg-foreground/5"
              >
                Comprar ahora
              </Link>
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
