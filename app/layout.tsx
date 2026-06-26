import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { CartProvider } from "@/lib/cart-context";
import { CustomerProvider } from "@/lib/customer-context";
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
  alternates: { canonical: "/" },
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/txn2dvr.css" />
      </head>
      <body className="font-sans antialiased">
        <JsonLd data={organizationJsonLd()} />
        <CustomerProvider>
          <CartProvider>{children}</CartProvider>
        </CustomerProvider>
        {process.env.NEXT_PUBLIC_VERCEL_ANALYTICS === "true" ? <Analytics /> : null}
      </body>
    </html>
  );
}
