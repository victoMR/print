import type { NextConfig } from "next";
import { NEXT_IMAGE_REMOTE_PATTERNS } from "./lib/next-image-hosts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";
const apiOrigin = apiUrl.replace(/\/$/, "");

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin} https://api.stripe.com https://vitals.vercel-insights.com`,
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/catalogo", destination: "/shop", permanent: true },
      { source: "/producto/:slug", destination: "/product/:slug", permanent: true },
      { source: "/aviso-de-privacidad", destination: "/privacidad", permanent: true },
      { source: "/carrito", destination: "/checkout", permanent: false },
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
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
  images: {
    remotePatterns: NEXT_IMAGE_REMOTE_PATTERNS,
  },
};

export default nextConfig;
