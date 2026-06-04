import type { Metadata, Viewport } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { CartProvider } from "@/lib/cart-context";
import { CustomerProvider } from "@/lib/customer-context";
import { JsonLd } from "@/components/seo/json-ld";
import { MEDIA } from "@/lib/media-urls";
import {
  DEFAULT_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  buildDefaultMetadata,
  getSiteUrl,
  organizationJsonLd,
} from "@/lib/seo";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

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
  themeColor: "#FAFAFA",
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
        {/* Ruta relativa — evita localhost en preload si NEXT_PUBLIC_SITE_URL es de dev */}
        <link
          rel="preload"
          as="image"
          href={MEDIA.hero.poster}
          fetchPriority="high"
        />
      </head>
      <body
        className={`${dmSans.variable} ${playfairDisplay.variable} font-sans antialiased`}
      >
        <JsonLd data={organizationJsonLd()} />
        <CustomerProvider>
          <CartProvider>{children}</CartProvider>
        </CustomerProvider>
        {process.env.NEXT_PUBLIC_VERCEL_ANALYTICS === "true" ? <Analytics /> : null}
      </body>
    </html>
  );
}
