import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { NEXT_IMAGE_REMOTE_PATTERNS } from "./lib/next-image-hosts";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// CSP is set dynamically per-request in middleware.ts (nonce-based).
// Only non-CSP security headers are set here.

const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/:locale(mx|us)/catalogo", destination: "/:locale/shop", permanent: true },
      {
        source: "/:locale(mx|us)/producto/:slug",
        destination: "/:locale/product/:slug",
        permanent: true,
      },
      {
        source: "/:locale(mx|us)/aviso-de-privacidad",
        destination: "/:locale/privacidad",
        permanent: true,
      },
      {
        source: "/:locale(mx|us)/devoluciones",
        destination: "/:locale/envios-y-devoluciones",
        permanent: true,
      },
      {
        source: "/:locale(mx|us)/envios",
        destination: "/:locale/envios-y-devoluciones",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    const base = apiOrigin;
    return [
      {
        source: "/api/v1/:path*",
        destination: `${base}/api/v1/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${base}/uploads/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: NEXT_IMAGE_REMOTE_PATTERNS,
    qualities: [75, 90],
  },
};

export default withNextIntl(nextConfig);
