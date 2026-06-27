import type { NextConfig } from "next";
import { NEXT_IMAGE_REMOTE_PATTERNS } from "./lib/next-image-hosts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";
const apiOrigin = apiUrl.replace(/\/$/, "");

const csp = [
  "default-src 'self'",
  // 'unsafe-inline' required for JSON-LD script tags and Next.js inline chunks.
  // TODO: migrate to nonce-based CSP via Next.js middleware for full XSS protection.
  // 'unsafe-eval' removed — it was never needed in production and disables eval()-based attacks.
  "script-src 'self' 'unsafe-inline' https://js.stripe.com https://va.vercel-scripts.com https://*.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://use.typekit.net",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "font-src 'self' data: https://use.typekit.net https://p.typekit.net",
  `connect-src 'self' ${apiOrigin} https://api.stripe.com https://vitals.vercel-insights.com https://*.vercel-insights.com`,
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' mailto:",
  "navigate-to 'self' https: http: mailto: tel:",
].join("; ");

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/catalogo", destination: "/shop", permanent: true },
      { source: "/producto/:slug", destination: "/product/:slug", permanent: true },
      { source: "/aviso-de-privacidad", destination: "/privacidad", permanent: true },
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
    qualities: [75, 90],
  },
};

export default nextConfig;
