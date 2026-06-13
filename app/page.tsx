import { Header } from "@/components/boty/header";
import { Hero } from "@/components/boty/hero";
import { FeatureSection } from "@/components/boty/feature-section";
import { ProductGrid } from "@/components/boty/product-grid";
import { Testimonials } from "@/components/boty/testimonials";
import { CTABanner } from "@/components/boty/cta-banner";
import { Newsletter } from "@/components/boty/newsletter";
import { Footer } from "@/components/boty/footer";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { JsonLd } from "@/components/seo/json-ld";
import { fetchCatalogProducts } from "@/lib/api";
import type { Metadata } from "next";
import { DEFAULT_DESCRIPTION, getSiteUrl, websiteJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Inicio",
  description: DEFAULT_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Mr. Paps — Tienda POD",
    description: DEFAULT_DESCRIPTION,
    url: getSiteUrl(),
  },
};

export default async function HomePage() {
  const catalog = await fetchCatalogProducts({ limit: 48 });
  const products = catalog?.data ?? [];

  return (
    <main>
      <JsonLd data={websiteJsonLd()} />
      <Header />
      <Hero />
      <ProductGrid initialProducts={products} />
      {/* <FeatureSection /> 
      <Testimonials />
      <CTABanner />
      */}
      <Newsletter />
      <Footer />
      <ScrollToTop />
    </main>
  );
}
