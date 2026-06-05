import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/cuenta",
          "/checkout",
          "/carrito",
          "/login",
          "/registro",
          "/pedido",
          "/seguimiento",
          "/producto",
        ],
      },
      {
        userAgent: ["GPTBot", "ClaudeBot", "Google-Extended"],
        allow: ["/", "/shop", "/product/", "/privacidad", "/terminos", "/llms.txt"],
        disallow: [
          "/admin",
          "/api/",
          "/cuenta",
          "/checkout",
          "/carrito",
          "/login",
          "/registro",
          "/pedido",
          "/seguimiento",
          "/producto",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
