import { SiteShell } from "@/components/layout/SiteShell";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Print MX — Impresión bajo demanda",
    template: "%s · Print MX",
  },
  description:
    "Tienda POD en México: playeras, sudaderas y merch con fulfillment desde Tijuana. Precios en MXN, IVA incluido.",
  keywords: ["print on demand", "México", "playeras", "merch", "POD"],
  openGraph: {
    locale: "es_MX",
    type: "website",
    siteName: "Print MX",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
