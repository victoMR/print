import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { JsonLd } from "@/components/seo/json-ld";
import {
  DEFAULT_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  buildDefaultMetadata,
  getSiteUrl,
  organizationJsonLd,
} from "@/lib/seo";
import { LOCALE_HEADER, languageForLocale, isLocale } from "@/lib/i18n/locale";
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
  // /mx and /us are distinct markets, not just translations of the same page —
  // each page under app/[locale]/ should set its own canonical/hreflang via
  // generateMetadata; this default only covers the bare site root.
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

/**
 * This is the single root layout — it owns <html>/<body> for the whole app,
 * including /admin (which is not under app/[locale]/ and has no next-intl
 * context). The <html lang> is derived from the market header middleware
 * already sets for every request, defaulting to Spanish for /admin and any
 * other unprefixed route.
 *
 * Cart/customer/cookie-consent providers live in app/[locale]/layout.tsx, not
 * here — they call next-intl's useLocale() internally (e.g. CartProvider
 * derives the checkout currency from the market), so they must render inside
 * NextIntlClientProvider, which only exists under app/[locale]/. /admin
 * doesn't use any of them (confirmed no admin component calls
 * useCart/useCustomer/useCookieConsent), so it's fine that it renders without them.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const nonce = headerList.get("x-nonce") ?? undefined;
  const marketHeader = headerList.get(LOCALE_HEADER);
  const htmlLang = languageForLocale(isLocale(marketHeader) ? marketHeader : undefined);

  return (
    <html lang={htmlLang}>
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/txn2dvr.css" />
      </head>
      <body className="font-sans antialiased">
        <JsonLd data={organizationJsonLd()} nonce={nonce} />
        {children}
      </body>
    </html>
  );
}
