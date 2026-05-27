import { notFound } from "next/navigation";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { ProductDetail } from "@/components/boty/product-detail";
import { fetchCatalogProduct } from "@/lib/api";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  const res = await fetchCatalogProduct(slug);
  if (!res?.data) return { title: "Producto — Print MX" };
  return { title: `${res.data.name} — Print MX` };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const res = await fetchCatalogProduct(slug);

  if (!res?.data) notFound();
  if (res.data.variants.length === 0) notFound();

  return (
    <main className="min-h-screen">
      <Header />
      <ProductDetail product={res.data} />
      <Footer />
    </main>
  );
}
