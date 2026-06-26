import type { Metadata } from "next";
import type { CatalogProductDetail } from "./api-types";

export const SITE_NAME = "Mr. Paps";
export const SITE_TAGLINE = "Tienda POD";
export const DEFAULT_DESCRIPTION =
  "Productos personalizados impresos bajo demanda con envío a todo México.";
export const DEFAULT_OG_IMAGE_PATH = "/og-image.png";

const PRODUCTION_SITE_URL = "https://mrpapshop.com";

function isLocalhostUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url.startsWith("http") ? url : `https://${url}`);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
}

/**
 * URL pública del storefront. Ignora localhost en producción (builds con .env dev).
 * Prioridad: NEXT_PUBLIC_SITE_URL válida → Vercel production URL → fallback mrpapshop.com.
 */
export function getSiteUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  if (envUrl && !(process.env.NODE_ENV === "production" && isLocalhostUrl(envUrl))) {
    return envUrl;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`;
  }

  if (process.env.VERCEL_URL && process.env.VERCEL_ENV === "production") {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_SITE_URL;
  }

  return envUrl ?? "http://localhost:3000";
}

export function absoluteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export const defaultOpenGraph = {
  locale: "es_MX" as const,
  type: "website" as const,
  siteName: SITE_NAME,
};

export function buildDefaultMetadata(): Pick<
  Metadata,
  "metadataBase" | "openGraph" | "twitter"
> {
  const ogImage = absoluteUrl(DEFAULT_OG_IMAGE_PATH);
  return {
    metadataBase: new URL(getSiteUrl()),
    openGraph: {
      ...defaultOpenGraph,
      title: `${SITE_NAME} — ${SITE_TAGLINE}`,
      description: DEFAULT_DESCRIPTION,
      images: [{ url: ogImage, width: 1280, height: 720, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} — ${SITE_TAGLINE}`,
      description: DEFAULT_DESCRIPTION,
      images: [ogImage],
    },
  };
}

export const noIndexRobots: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};

export function productMetadata(product: CatalogProductDetail): Metadata {
  const title = product.name;
  const description =
    product.description?.trim() ||
    `${product.name} — impresión bajo demanda con envío a México.`;
  const canonical = `/product/${product.slug}`;
  const ogImage = absoluteUrl(product.thumbnail || DEFAULT_OG_IMAGE_PATH);
  const prices = product.variants.map((v) => v.retailPriceMxn);
  const price = prices.reduce(
    (min, p) => (Number(p) < Number(min) ? p : min),
    prices[0] ?? "0.00",
  );

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      ...defaultOpenGraph,
      type: "website",
      title,
      description,
      url: absoluteUrl(canonical),
      images: [{ url: ogImage, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    other: {
      "product:price:amount": price,
      "product:price:currency": "MXN",
    },
  };
}

export function organizationJsonLd() {
  const url = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url,
    logo: absoluteUrl(DEFAULT_OG_IMAGE_PATH),
    description: DEFAULT_DESCRIPTION,
    areaServed: { "@type": "Country", name: "México" },
  };
}

export function websiteJsonLd() {
  const url = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url,
    description: DEFAULT_DESCRIPTION,
    inLanguage: "es-MX",
    publisher: { "@type": "Organization", name: SITE_NAME, url },
  };
}

export function productJsonLd(product: CatalogProductDetail) {
  const url = absoluteUrl(`/product/${product.slug}`);
  const prices = product.variants.map((v) => Number(v.retailPriceMxn));
  const lowPrice = Math.min(...prices).toFixed(2);
  const highPrice = Math.max(...prices).toFixed(2);
  const inStock = product.variants.some((v) => v.inStock);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || DEFAULT_DESCRIPTION,
    image: (product.images?.length ? product.images : [product.thumbnail])
      .filter(Boolean)
      .map((url) => absoluteUrl(url)),
    url,
    sku: product.id,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "MXN",
      lowPrice,
      highPrice,
      offerCount: product.variants.length,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url,
    },
  };
}

export function productBreadcrumbJsonLd(product: CatalogProductDetail) {
  const home = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: home },
      { "@type": "ListItem", position: 2, name: "Tienda", item: `${home}/shop` },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: absoluteUrl(`/product/${product.slug}`),
      },
    ],
  };
}
