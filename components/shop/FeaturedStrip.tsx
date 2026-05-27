import { AnimatedReveal } from "@/components/ui/AnimatedReveal";
import { ProductGrid } from "@/components/shop/ProductGrid";
import type { CatalogProductSummary } from "@/lib/api-types";

type FeaturedStripProps = {
  products: CatalogProductSummary[];
};

export function FeaturedStrip({ products }: FeaturedStripProps) {
  return (
    <section className="px-4 py-16 md:px-6 md:py-24">
      <div className="mx-auto max-w-6xl">
        <AnimatedReveal>
          <div className="mb-10 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Destacados</h2>
              <p className="mt-2 text-foreground/65">
                Productos sincronizados desde Printful
              </p>
            </div>
          </div>
        </AnimatedReveal>
        <ProductGrid products={products} columns={3} />
      </div>
    </section>
  );
}
