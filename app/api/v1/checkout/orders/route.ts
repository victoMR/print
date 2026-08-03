import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getApiInternalBaseUrl } from "@/lib/api-internal-url";
import { extractClientIp, lookupCountryByIp } from "@/lib/i18n/geo-lookup";
import { localeFromCountry } from "@/lib/i18n/locale";

/**
 * Proxy explícito Next.js → API Express para /checkout/orders (tiene
 * prioridad sobre el rewrite genérico de next.config.ts para esta ruta
 * puntual — mismo patrón que app/api/v1/webhooks/stripe/route.ts).
 *
 * Agrega x-verified-market: el resultado de una consulta de geo-IP FRESCA
 * (no la cookie cacheada de hasta 1 día) sobre la IP real del visitante, para
 * que el backend pueda rechazar un pedido cuya moneda no coincide con la
 * ubicación real detectada — ver mrpaps-checkout.service.ts::assertMarketMatchesCurrency.
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
    const res = await fetch(`${base}/api/v1/checkout/orders`, {
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
    return NextResponse.json({ ok: false, error: "No se pudo crear el pedido." }, { status: 502 });
  }
}
