/** Debe coincidir con `images.remotePatterns` en next.config.ts */
export const NEXT_IMAGE_REMOTE_PATTERNS = [
  { protocol: "https" as const, hostname: "images.unsplash.com" },
  { protocol: "https" as const, hostname: "images.pexels.com" },
  { protocol: "https" as const, hostname: "files.cdn.printful.com" },
  { protocol: "https" as const, hostname: "img.printful.com" },
  { protocol: "https" as const, hostname: "**.printful.com" },
  { protocol: "https" as const, hostname: "i.pinimg.com" },
  { protocol: "https" as const, hostname: "**.supabase.co" },
];

function hostnameMatchesPattern(hostname: string, pattern: string): boolean {
  if (pattern.startsWith("**.")) {
    const base = pattern.slice(3);
    return hostname === base || hostname.endsWith(`.${base}`);
  }
  return hostname === pattern;
}

/** true si `next/image` puede optimizar esta URL sin error de host. */
export function isNextImageSrc(src: string): boolean {
  if (!src) return true;
  if (src.startsWith("/") && !src.startsWith("//")) return true;

  try {
    const { hostname, protocol } = new URL(src);
    if (protocol !== "http:" && protocol !== "https:") return false;

    return NEXT_IMAGE_REMOTE_PATTERNS.some((p) => {
      if (p.protocol && p.protocol !== protocol.replace(":", "")) return false;
      return hostnameMatchesPattern(hostname, p.hostname);
    });
  } catch {
    return false;
  }
}
