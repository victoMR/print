/** URL del API para proxies server-side (Next → Express). */
export function getApiInternalBaseUrl(): string {
  const url =
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://127.0.0.1:4000";
  return url.replace(/\/$/, "");
}
