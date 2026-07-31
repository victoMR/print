import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { CartProvider } from "@/lib/cart-context";
import { CustomerProvider } from "@/lib/customer-context";
import { CookieConsentProvider } from "@/lib/cookie-consent-context";
import { CookieConsentBanner } from "@/components/legal/cookie-consent-banner";
import { ConditionalAnalytics } from "@/components/legal/conditional-analytics";
import { JsonLd } from "@/components/seo/json-ld";
import {
  DEFAULT_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  buildDefaultMetadata,
  getSiteUrl,
  organizationJsonLd,
} from "@/lib/seo";
import "./globals.css";

const defaultMeta = buildDefaultMetadata();

export const metadata: Metadata = {
  ...defaultMeta,
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: ["print", "printful", "México", "POD", "tienda", "ropa personalizada"],
  // Same-URL locale switching (cookie/geo-based, no /en/ prefix) means hreflang
  // alternates would be misleading — Googlebot doesn't reliably vary by cookie/geo
  // across crawls, so we only claim the one canonical URL rather than a fake
  // per-language mapping that all pointed at this same address.
  alternates: {
    canonical: getSiteUrl(),
  },
  openGraph: {
    ...defaultMeta.openGraph,
    url: getSiteUrl(),
  },
};

export const viewport: Viewport = {
  themeColor: "#F5F0E6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/txn2dvr.css" />
      </head>
      <body className="font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <JsonLd data={organizationJsonLd()} nonce={nonce} />
          <CookieConsentProvider>
            <CustomerProvider>
              <CartProvider>{children}</CartProvider>
            </CustomerProvider>
            <CookieConsentBanner />
            {process.env.NEXT_PUBLIC_VERCEL_ANALYTICS === "true" ? <ConditionalAnalytics /> : null}
          </CookieConsentProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
