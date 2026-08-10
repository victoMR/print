import { headers } from "next/headers";
import { Header } from "@/components/boty/header";
import { Hero } from "@/components/boty/hero";
import { HomeEditorialGrid } from "@/components/boty/home-editorial-grid";
import { Footer } from "@/components/boty/footer";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { JsonLd } from "@/components/seo/json-ld";
import type { Metadata } from "next";
import { defaultDescription, getSiteUrl, ogLocaleForMarket, websiteJsonLd } from "@/lib/seo";
import { getRequestMarket } from "@/lib/i18n/get-request-market";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const market = await getRequestMarket();
  const t = await getTranslations("home");
  const description = defaultDescription(market);
  return {
    title: t("metaTitle"),
    description,
    alternates: { canonical: "/" },
    openGraph: {
      locale: ogLocaleForMarket(market),
      title: t("ogTitle"),
      description,
      url: getSiteUrl(),
    },
  };
}

export default async function HomePage() {
  const [headerList, market] = await Promise.all([headers(), getRequestMarket()]);
  const nonce = headerList.get("x-nonce") ?? undefined;
  return (
    <main>
      <JsonLd data={websiteJsonLd(market)} nonce={nonce} />
      <Header alwaysVisible />
      <Hero />
      <HomeEditorialGrid />
      <Footer />
      <ScrollToTop />
    </main>
  );
}
