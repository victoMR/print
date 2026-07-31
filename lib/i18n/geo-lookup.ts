// Real IP-based geolocation for self-hosted deployments (VPS behind nginx),
// where there's no Vercel edge to inject a country header. Uses a free
// external API (ipwho.is) — no API key needed at this volume. Called at most
// once per visitor per day (the result is cached in a short-lived cookie by
// the caller), so this never runs on every request.
//
// NOTE: ipapi.co was tried first but puts server-to-server requests (no
// browser/JS) behind a Cloudflare bot challenge, so it never returns usable
// data from a backend — ipwho.is doesn't do this and was verified to work.

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

/** First public IP in a comma-separated X-Forwarded-For chain, or null. */
export function extractClientIp(headers: {
  get(name: string): string | null;
}): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const candidates = xff.split(",").map((s) => s.trim()).filter(Boolean);
    const publicIp = candidates.find((ip) => !isPrivateIp(ip));
    if (publicIp) return publicIp;
  }

  const xRealIp = headers.get("x-real-ip")?.trim();
  if (xRealIp && !isPrivateIp(xRealIp)) return xRealIp;

  return null;
}

/**
 * Looks up the ISO country code for a public IP via ipwho.is. Returns null on
 * any failure (timeout, rate limit, malformed response) — callers must treat
 * that as "unknown" and fall back to Accept-Language, never block/error the page.
 */
export async function lookupCountryByIp(ip: string): Promise<string | null> {
  if (!ip || isPrivateIp(ip)) return null;

  try {
    const res = await fetch(
      `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country_code`,
      { signal: AbortSignal.timeout(1500) },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as { success?: boolean; country_code?: string };
    if (!data.success || !data.country_code) return null;

    const code = data.country_code.toUpperCase();
    return /^[A-Z]{2}$/.test(code) ? code : null;
  } catch {
    return null;
  }
}
