import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
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
    const t = await getTranslations("notFound");
    return { title: t("metaTitle") };
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
    const t = await getTranslations("shop.unavailable");
    return <ProductUnavailable message={t("noVariantsMessage")} />;
  }

  const product = res.data;

  return (
    <main className="min-h-screen">
      <JsonLd data={[productJsonLd(product, market), productBreadcrumbJsonLd(product, market)]} nonce={nonce} />
      <Header alwaysVisible />
      <ProductDetail product={product} />
      <Footer />
    </main>
  );
}
