"use client";

import { useState } from "react";
import Link from "next/link";
import { RemoteImage } from "@/components/ui/remote-image";
import { ShoppingBag } from "lucide-react";
import { resolveProductImageSrc } from "@/lib/asset-url";
import type { CatalogProductSummary } from "@/lib/api-types";
import { formatMxn } from "@/lib/utils";

type CatalogProductCardProps = {
  product: CatalogProductSummary;
  index?: number;
  isVisible?: boolean;
  showQuickAdd?: boolean;
};

export function CatalogProductCard({
  product,
  index = 0,
  isVisible = true,
  showQuickAdd = false,
}: CatalogProductCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = resolveProductImageSrc(product.thumbnail);

  return (
    <Link
      href={`/product/${product.slug}`}
      className={`group transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className="bg-card rounded-3xl overflow-hidden boty-shadow boty-transition group-hover:scale-[1.02]">
        <div className="relative aspect-square bg-muted overflow-hidden">
          <div
            className={`absolute inset-0 bg-gradient-to-br from-muted via-muted/50 to-muted animate-pulse transition-opacity duration-500 ${
              imageLoaded ? "opacity-0" : "opacity-100"
            }`}
          />
          <RemoteImage
            src={imageFailed ? "/placeholder.svg" : imageSrc}
            alt={product.name}
            fill
            className={`object-cover boty-transition group-hover:scale-105 transition-opacity duration-500 ${
              imageLoaded || imageFailed ? "opacity-100" : "opacity-0"
            }`}
            sizes="(max-width: 768px) 50vw, 25vw"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageFailed(true);
              setImageLoaded(true);
            }}
          />
          {showQuickAdd && (
            <span
              className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 boty-transition boty-shadow"
              aria-hidden
            >
              <ShoppingBag className="w-5 h-5 text-foreground" />
            </span>
          )}
        </div>

        <div className="p-6">
          <h3 className="font-serif text-xl text-foreground mb-1">{product.name}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {product.variantCount}{" "}
            {product.variantCount === 1 ? "variante" : "variantes"}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium text-foreground">
              Desde {formatMxn(product.priceFromMxn)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
