"use client";

import { useState } from "react";
import Link from "next/link";
import { RemoteImage } from "@/components/ui/remote-image";
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
      className={`group block transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      {/* Image */}
      <div className="relative aspect-[4/5] overflow-hidden bg-[#EBE7DB]">
        <div
          className={`absolute inset-0 bg-[#EBE7DB] animate-pulse transition-opacity duration-500 ${
            imageLoaded ? "opacity-0" : "opacity-100"
          }`}
        />
        <RemoteImage
          src={imageFailed ? "/placeholder.svg" : imageSrc}
          alt={product.name}
          fill
          className={`object-cover boty-transition group-hover:scale-[1.04] transition-opacity duration-500 ${
            imageLoaded || imageFailed ? "opacity-100" : "opacity-0"
          }`}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageFailed(true);
            setImageLoaded(true);
          }}
        />
      </div>

      {/* Info */}
      <div className="pt-4 pb-2">
        <h3 className="text-[13px] tracking-[0.12em] uppercase text-[#2A2726] font-sans mb-1 line-clamp-1">
          {product.name}
        </h3>
        <p className="text-[12px] text-[#7A756E] tracking-[0.08em]">
          {formatMxn(product.priceFromMxn)}
        </p>
      </div>
    </Link>
  );
}
