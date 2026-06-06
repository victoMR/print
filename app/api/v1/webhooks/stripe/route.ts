import { NextResponse } from "next/server";
import { getApiInternalBaseUrl } from "@/lib/api-internal-url";

/**
 * Proxy explícito Stripe → API Express.
 * Tiene prioridad sobre rewrites en next.config (evita 405 / "Cannot GET").
 */
export async function GET() {
  const base = getApiInternalBaseUrl();
  try {
    const res = await fetch(`${base}/api/v1/webhooks/stripe`, { cache: "no-store" });
    const contentType = res.headers.get("content-type") ?? "application/json";
    const body = await res.text();
    return new NextResponse(body, { status: res.status, headers: { "Content-Type": contentType } });
  } catch {
    // Don't expose the internal API URL or error detail — it reveals infrastructure topology.
    return NextResponse.json({ ok: false, error: "Webhook no disponible" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const base = getApiInternalBaseUrl();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new NextResponse("Falta stripe-signature", { status: 400 });
  }

  const body = await request.arrayBuffer();

  try {
    const res = await fetch(`${base}/api/v1/webhooks/stripe`, {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("content-type") ?? "application/json",
        "stripe-signature": signature,
      },
      body,
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") ?? "text/plain" },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "Proxy webhook falló",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
