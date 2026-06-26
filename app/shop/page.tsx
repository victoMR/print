import type { Metadata } from "next";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { ShopPageContent } from "@/components/boty/shop-page-content";
import { fetchCatalogProducts } from "@/lib/api";
import { DEFAULT_DESCRIPTION, getSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Tienda",
  description:
    "Explora camisetas, sudaderas y más productos personalizados con impresión bajo demanda. Envío a todo México.",
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Tienda — Mr. Paps",
    description: DEFAULT_DESCRIPTION,
    url: `${getSiteUrl()}/shop`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Tienda — Mr. Paps",
    description: DEFAULT_DESCRIPTION,
  },
};

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
