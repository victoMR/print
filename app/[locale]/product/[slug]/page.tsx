import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { ProductDetail } from "@/components/boty/product-detail";
import { ProductUnavailable } from "@/components/boty/product-unavailable";
import { JsonLd } from "@/components/seo/json-ld";
import { fetchCatalogProduct } from "@/lib/api";
import {
  productBreadcrumbJsonLd,
  productJsonLd,
  productMetadata,
} from "@/lib/seo";
import { getRequestMarket } from "@/lib/i18n/get-request-market";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const market = await getRequestMarket();
  const res = await fetchCatalogProduct(slug, market);
  if (!res?.data) {
    return { title: "Producto no encontrado" };
  }
  return productMetadata(res.data, market);
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const market = await getRequestMarket();
  const [headerList, res] = await Promise.all([
    headers(),
    fetchCatalogProduct(slug, market),
  ]);
  const nonce = headerList.get("x-nonce") ?? undefined;

  if (!res?.data) notFound();

  if (res.data.variants.length === 0) {
    return (
      <ProductUnavailable
        message="Este producto está en el catálogo pero no tiene variantes con precio. En admin, edítalo y agrega al menos una variante activa."
      />
    );
  }

  const product = res.data;

  return (
    <main className="min-h-screen">
      <JsonLd data={[productJsonLd(product, market), productBreadcrumbJsonLd(product)]} nonce={nonce} />
      <Header alwaysVisible />
      <ProductDetail product={product} />
      <Footer />
    </main>
  );
}
