import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { ShopPageContent } from "@/components/boty/shop-page-content";
import { fetchCatalogProducts } from "@/lib/api";
import { defaultDescription, getSiteUrl } from "@/lib/seo";
import { getRequestMarket } from "@/lib/i18n/get-request-market";

export async function generateMetadata(): Promise<Metadata> {
  const [t, market] = await Promise.all([getTranslations("shop.metadata"), getRequestMarket()]);
  const description = t("description");
  const ogDescription = defaultDescription(market);
  return {
    title: t("title"),
    description,
    alternates: { canonical: "/shop" },
    openGraph: {
      title: t("ogTitle"),
      description: ogDescription,
      url: `${getSiteUrl()}/shop`,
    },
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: ogDescription,
    },
  };
}

export default async function ShopPage() {
  const catalog = await fetchCatalogProducts({ limit: 48 });
  const products = catalog?.data ?? [];

  return (
    <main className="min-h-screen flex flex-col">
      <Header alwaysVisible />
      <div className="flex-1">
        <ShopPageContent products={products} />
      </div>
      <div className="mt-auto w-full shrink-0">
        <Footer />
      </div>
    </main>
  );
}
