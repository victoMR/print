import type { NextConfig } from "next";
import { NEXT_IMAGE_REMOTE_PATTERNS } from "./lib/next-image-hosts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/catalogo", destination: "/shop", permanent: true },
      { source: "/producto/:slug", destination: "/product/:slug", permanent: true },
      { source: "/carrito", destination: "/checkout", permanent: false },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiUrl.replace(/\/$/, "")}/api/v1/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: NEXT_IMAGE_REMOTE_PATTERNS,
  },
};

export default nextConfig;
