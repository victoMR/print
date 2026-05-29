"use client";

import { AnimatedReveal } from "@/components/ui/AnimatedReveal";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { PriceTag } from "@/components/ui/PriceTag";
import { QtyButton, VariantPicker } from "@/components/shop/VariantPicker";
import type { CatalogProductDetail } from "@/lib/api-types";
import { useCart } from "@/lib/cart-context";
import Image from "next/image";
import { useMemo, useState } from "react";

type ProductDetailViewProps = {
  product: CatalogProductDetail;
};

export function ProductDetailView({ product }: ProductDetailViewProps) {
  const { addItem } = useCart();
  const [variantId, setVariantId] = useState(product.variants[0]?.variantId);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const selected = useMemo(
    () => product.variants.find((v) => v.variantId === variantId),
    [product.variants, variantId],
  );

  const sizes = [...new Set(product.variants.map((v) => v.size))];
  const colors = [...new Set(product.variants.map((v) => v.color))];

  function pickVariant(size: string, color: string) {
    const match = product.variants.find((v) => v.size === size && v.color === color)
      ?? product.variants.find((v) => v.size === size)
      ?? product.variants.find((v) => v.color === color);
    if (match) setVariantId(match.variantId);
  }

  function handleAdd() {
    if (!selected) return;
    addItem(
      {
        variantId: selected.variantId,
        productSlug: product.slug,
        productName: product.name,
        variantLabel: `${selected.size} / ${selected.color}`,
        retailPriceMxn: selected.retailPriceMxn,
        thumbnail: product.thumbnail,
      },
      quantity,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 md:px-6">
      <div className="grid gap-10 lg:grid-cols-2">
        <AnimatedReveal direction="right">
          <GlassCard className="relative aspect-square overflow-hidden">
            <Image
              src={product.thumbnail}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </GlassCard>
        </AnimatedReveal>

        <AnimatedReveal delay={0.1}>
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-3xl font-bold md:text-4xl">{product.name}</h1>
              <p className="mt-4 text-foreground/70 leading-relaxed">{product.description}</p>
            </div>
            {selected && <PriceTag amount={selected.retailPriceMxn} />}

            <VariantPicker
              label="Talla"
              options={sizes}
              selected={selected?.size ?? ""}
              onSelect={(size) => pickVariant(size, selected?.color ?? colors[0] ?? "")}
            />
            <VariantPicker
              label="Color"
              options={colors}
              selected={selected?.color ?? ""}
              onSelect={(color) => pickVariant(selected?.size ?? sizes[0] ?? "", color)}
            />

            <div>
              <p className="mb-2 text-sm font-medium">Cantidad</p>
              <div className="flex items-center gap-3">
                <QtyButton label="−" onClick={() => setQuantity((q) => Math.max(1, q - 1))} />
                <span className="w-8 text-center font-medium">{quantity}</span>
                <QtyButton label="+" onClick={() => setQuantity((q) => q + 1)} />
              </div>
            </div>

            <GlassButton variant="primary" onClick={handleAdd}>
              {added ? "Agregado ✓" : "Agregar al carrito"}
            </GlassButton>
            <p className="text-xs text-foreground/50">
              Envío estimado 5–14 días · Aduana incluida para México
            </p>
          </div>
        </AnimatedReveal>
      </div>
    </div>
  );
}
