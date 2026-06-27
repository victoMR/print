import { headers } from "next/headers";
import { Header } from "@/components/boty/header";
import { Hero } from "@/components/boty/hero";
import { HomeEditorialGrid } from "@/components/boty/home-editorial-grid";
import { Footer } from "@/components/boty/footer";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { JsonLd } from "@/components/seo/json-ld";
import type { Metadata } from "next";
import { DEFAULT_DESCRIPTION, getSiteUrl, websiteJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Inicio",
  description: DEFAULT_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Mr. Paps — Lujo Silencioso",
    description: DEFAULT_DESCRIPTION,
    url: getSiteUrl(),
  },
};

export default async function HomePage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <main>
      <JsonLd data={websiteJsonLd()} nonce={nonce} />
      <Header alwaysVisible />
      <Hero />
      <HomeEditorialGrid />
      <Footer />
      <ScrollToTop />
    </main>
  );
}
