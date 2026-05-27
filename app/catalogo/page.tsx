import { CatalogHeader } from "@/components/shop/CatalogHeader";
import { EmptyCatalog, hasCatalogProducts } from "@/components/shop/EmptyCatalog";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { fetchCatalogProducts } from "@/lib/api";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "Explora playeras, sudaderas, tote bags y más. Precios en MXN con IVA incluido.",
};

export default async function CatalogoPage() {
  const response = await fetchCatalogProducts();

  return (
    <section className="px-4 pb-16 md:px-6">
      <div className="mx-auto max-w-6xl">
        <CatalogHeader />
        {hasCatalogProducts(response) ? (
          <ProductGrid products={response.data} columns={3} />
        ) : (
          <EmptyCatalog />
        )}
      </div>
    </section>
  );
}
