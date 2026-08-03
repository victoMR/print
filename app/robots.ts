import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

// "/*/..." matches under either market prefix (/mx/... or /us/...) — the
// wildcard extension is honored by Google/Bing, avoids duplicating every
// rule per market.
const DISALLOW_PATHS = [
  "/admin",
  "/api/",
  "/*/cuenta",
  "/*/checkout",
  "/*/carrito",
  "/*/login",
  "/*/registro",
  "/*/pedido",
  "/*/seguimiento",
  "/*/producto",
];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW_PATHS,
      },
      {
        userAgent: ["GPTBot", "ClaudeBot", "Google-Extended"],
        allow: ["/", "/*/shop", "/*/product/", "/*/privacidad", "/*/terminos", "/llms.txt"],
        disallow: DISALLOW_PATHS,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
