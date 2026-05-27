import { ProductCard } from "@/components/shop/ProductCard";
import type { CatalogProductSummary } from "@/lib/api-types";
import { cn } from "@/lib/utils";

type ProductGridProps = {
  products: CatalogProductSummary[];
  className?: string;
  columns?: 2 | 3 | 4;
};

const colClass = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
};

export function ProductGrid({
  products,
  className,
  columns = 3,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <p className="text-center text-foreground/60 py-12">
        No hay productos disponibles.
      </p>
    );
  }

  return (
    <ul
      className={cn(
        "grid gap-5 md:gap-6 list-none p-0 m-0",
        colClass[columns],
        className,
      )}
    >
      {products.map((product) => (
        <li key={product.slug}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
