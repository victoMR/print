import { notFound } from "next/navigation";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { ProductDetail } from "@/components/boty/product-detail";
import { ProductUnavailable } from "@/components/boty/product-unavailable";
import { fetchCatalogProduct } from "@/lib/api";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  const res = await fetchCatalogProduct(slug);
  if (!res?.data) return { title: "Producto — Mr. Paps" };
  return { title: `${res.data.name} — Mr. Paps` };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const res = await fetchCatalogProduct(slug);

  if (!res?.data) notFound();

  if (res.data.variants.length === 0) {
    return (
      <ProductUnavailable
        message="Este producto está en el catálogo pero no tiene variantes con precio. En admin, edítalo y agrega al menos una variante activa."
      />
    );
  }

  return (
    <main className="min-h-screen">
      <Header />
      <ProductDetail product={res.data} />
      <Footer />
    </main>
  );
}
