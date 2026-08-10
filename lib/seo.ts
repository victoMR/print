import type { Metadata } from "next";
import type { CatalogProductDetail } from "./api-types";
import type { Locale } from "./i18n/locale";
import {
  LEGAL_CONTACT_EMAIL,
  SITE_INSTAGRAM_URL,
  SITE_WHATSAPP_PHONE_E164,
  SITE_WHATSAPP_URL,
} from "./legal/config";

export const SITE_NAME = "Mr. Paps";
export const SITE_TAGLINE = "Tienda POD";
export const DEFAULT_OG_IMAGE_PATH = "/og-image.png";

const DEFAULT_DESCRIPTION_BY_MARKET: Record<Locale, string> = {
  mx: "Productos personalizados impresos bajo demanda con envío a todo México.",
  us: "Custom, print-on-demand products shipped within the United States.",
};

/** Descripción SEO por defecto — varía por mercado (menciona el país de envío), no por idioma de UI. */
export function defaultDescription(market: Locale = "mx"): string {
  return DEFAULT_DESCRIPTION_BY_MARKET[market];
}

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

/** OG `locale` and JSON-LD `inLanguage` per market — approximates the market's default language. */
export function ogLocaleForMarket(market: Locale): "es_MX" | "en_US" {
  return market === "us" ? "en_US" : "es_MX";
}

export function jsonLdLanguageForMarket(market: Locale): "es-MX" | "en-US" {
  return market === "us" ? "en-US" : "es-MX";
}

export function currencyForMarket(market: Locale): "MXN" | "USD" {
  return market === "us" ? "USD" : "MXN";
}

export function buildDefaultMetadata(market: Locale = "mx"): Pick<
  Metadata,
  "metadataBase" | "openGraph" | "twitter"
> {
  const ogImage = absoluteUrl(DEFAULT_OG_IMAGE_PATH);
  return {
    metadataBase: new URL(getSiteUrl()),
    openGraph: {
      ...defaultOpenGraph,
      locale: ogLocaleForMarket(market),
      title: `${SITE_NAME} — ${SITE_TAGLINE}`,
      description: defaultDescription(market),
      images: [{ url: ogImage, width: 1280, height: 720, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} — ${SITE_TAGLINE}`,
      description: defaultDescription(market),
      images: [ogImage],
    },
  };
}

export const noIndexRobots: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};

export function productMetadata(product: CatalogProductDetail, market: Locale = "mx"): Metadata {
  const title = product.name;
  const description =
    product.description?.trim() ||
    (market === "us"
      ? `${product.name} — print on demand, shipped within the US.`
      : `${product.name} — impresión bajo demanda con envío a México.`);
  const canonical = `/product/${product.slug}`;
  const ogImage = absoluteUrl(product.thumbnail || DEFAULT_OG_IMAGE_PATH);
  const useUsd = market === "us" && product.variants.some((v) => v.retailPriceUsd);
  const prices = product.variants.map((v) => (useUsd ? v.retailPriceUsd : v.retailPriceMxn) ?? v.retailPriceMxn);
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
      locale: ogLocaleForMarket(market),
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
      "product:price:currency": useUsd ? "USD" : "MXN",
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
    description: defaultDescription("mx"),
    areaServed: [
      { "@type": "Country", name: "México" },
      { "@type": "Country", name: "United States" },
    ],
    email: LEGAL_CONTACT_EMAIL,
    telephone: SITE_WHATSAPP_PHONE_E164,
    sameAs: [SITE_INSTAGRAM_URL],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: SITE_WHATSAPP_PHONE_E164,
        url: SITE_WHATSAPP_URL,
        availableLanguage: ["Spanish", "English"],
      },
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        email: LEGAL_CONTACT_EMAIL,
        availableLanguage: ["Spanish"],
      },
    ],
  };
}

export function websiteJsonLd(market: Locale = "mx") {
  const url = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url,
    description: defaultDescription(market),
    inLanguage: jsonLdLanguageForMarket(market),
    publisher: { "@type": "Organization", name: SITE_NAME, url },
  };
}

export function productJsonLd(product: CatalogProductDetail, market: Locale = "mx") {
  const url = absoluteUrl(`/product/${product.slug}`);
  const useUsd = market === "us" && product.variants.some((v) => v.retailPriceUsd);
  const prices = product.variants.map((v) => Number((useUsd ? v.retailPriceUsd : v.retailPriceMxn) ?? v.retailPriceMxn));
  const lowPrice = Math.min(...prices).toFixed(2);
  const highPrice = Math.max(...prices).toFixed(2);
  const inStock = product.variants.some((v) => v.inStock);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || defaultDescription(market),
    image: (product.images?.length ? product.images : [product.thumbnail])
      .filter(Boolean)
      .map((url) => absoluteUrl(url)),
    url,
    sku: product.id,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: useUsd ? "USD" : "MXN",
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

const BREADCRUMB_LABELS_BY_MARKET: Record<Locale, { home: string; shop: string }> = {
  mx: { home: "Inicio", shop: "Tienda" },
  us: { home: "Home", shop: "Shop" },
};

export function productBreadcrumbJsonLd(product: CatalogProductDetail, market: Locale = "mx") {
  const home = getSiteUrl();
  const labels = BREADCRUMB_LABELS_BY_MARKET[market];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: labels.home, item: home },
      { "@type": "ListItem", position: 2, name: labels.shop, item: `${home}/shop` },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: absoluteUrl(`/product/${product.slug}`),
      },
    ],
  };
}
