import type { MetadataRoute } from "next";
import { fetchCatalogProducts } from "@/lib/api";
import { getSiteUrl } from "@/lib/seo";
import { LOCALES } from "@/lib/i18n/locale";

const STATIC_PATHS = ["", "/shop", "/privacidad", "/terminos"];

function alternates(siteUrl: string, path: string): Record<string, string> {
  return Object.fromEntries(LOCALES.map((locale) => [locale, `${siteUrl}/${locale}${path}`]));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const staticRoutes: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    STATIC_PATHS.map((path) => ({
      url: `${siteUrl}/${locale}${path}`,
      changeFrequency: (path === "" ? "weekly" : path === "/shop" ? "daily" : "monthly") as
        | "weekly"
        | "daily"
        | "monthly",
      priority: path === "" ? 1 : path === "/shop" ? 0.9 : 0.3,
      alternates: { languages: alternates(siteUrl, path) },
    })),
  );

  const catalog = await fetchCatalogProducts();
  const products = catalog?.data ?? [];

  const productRoutes: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    products.map((p) => ({
      url: `${siteUrl}/${locale}/product/${p.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: { languages: alternates(siteUrl, `/product/${p.slug}`) },
    })),
  );

  return [...staticRoutes, ...productRoutes];
}
