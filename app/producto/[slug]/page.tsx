import { EmptyCatalog } from "@/components/shop/EmptyCatalog";
import { ProductDetailView } from "@/components/shop/ProductDetailView";
import { fetchCatalogProduct } from "@/lib/api";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const response = await fetchCatalogProduct(slug);
  if (!response?.data) return { title: "Producto no encontrado" };
  return {
    title: response.data.name,
    description: response.data.description,
    openGraph: {
      title: response.data.name,
      description: response.data.description,
      images: [{ url: response.data.thumbnail }],
    },
  };
}

export default async function ProductoPage({ params }: PageProps) {
  const { slug } = await params;
  const response = await fetchCatalogProduct(slug);

  if (!response?.data) {
    return (
      <section className="px-4 pb-16 md:px-6">
        <div className="mx-auto max-w-6xl">
          <EmptyCatalog
            title="Producto no disponible"
            message="No encontramos este producto. Verifica que la API esté activa y el producto exista en Printful."
          />
        </div>
      </section>
    );
  }

  if (response.data.variants.length === 0) notFound();

  return <ProductDetailView product={response.data} />;
}
