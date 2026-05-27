import { GlassCard } from "@/components/ui/GlassCard";
import { PriceTag } from "@/components/ui/PriceTag";
import type { CatalogProductSummary } from "@/lib/api-types";
import Image from "next/image";
import Link from "next/link";

type ProductCardProps = {
  product: CatalogProductSummary;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/producto/${product.slug}`} className="group block h-full">
      <GlassCard
        as="article"
        className="flex h-full flex-col overflow-hidden hover:shadow-xl hover:shadow-indigo-500/10 transition-shadow duration-500"
      >
        <div className="relative aspect-[4/5] overflow-hidden">
          <Image
            src={product.thumbnail}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <span className="absolute left-3 top-3 rounded-full glass px-3 py-1 text-xs font-medium">
            {product.variantCount} variantes
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-indigo-500 transition-colors">
            {product.name}
          </h3>
          <p className="text-sm text-foreground/60">Desde</p>
          <PriceTag amount={product.priceFromMxn} />
        </div>
      </GlassCard>
    </Link>
  );
}
