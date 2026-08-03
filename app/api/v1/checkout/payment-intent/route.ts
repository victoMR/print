import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getApiInternalBaseUrl } from "@/lib/api-internal-url";
import { extractClientIp, lookupCountryByIp } from "@/lib/i18n/geo-lookup";
import { localeFromCountry } from "@/lib/i18n/locale";

/**
 * Proxy explícito para /checkout/payment-intent — el último punto antes de
 * cobrar con Stripe, así que esta es la verificación de mercado que más
 * importa (ver payment.routes.ts en el backend). Mismo patrón que
 * app/api/v1/checkout/orders/route.ts y app/api/v1/webhooks/stripe/route.ts.
 */
export async function POST(request: NextRequest) {
  const base = getApiInternalBaseUrl();

  const ip = extractClientIp(request.headers);
  const country = ip ? await lookupCountryByIp(ip) : null;
  const verifiedMarket = localeFromCountry(country) ?? null;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  if (verifiedMarket) headers.set("x-verified-market", verifiedMarket);

  try {
    const res = await fetch(`${base}/api/v1/checkout/payment-intent`, {
      method: "POST",
      headers,
      body: await request.text(),
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo iniciar el pago." }, { status: 502 });
  }
}
