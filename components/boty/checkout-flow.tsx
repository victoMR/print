"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createDraftOrder, fetchEstimate, fetchShippingRates } from "@/lib/api";
import type { CheckoutRecipient, ShippingRate } from "@/lib/api-types";
import { useCart } from "@/lib/cart-context";
import { MX_STATES } from "@/lib/mx-states";
import { cn, formatMxn } from "@/lib/utils";

export function BotyCheckoutFlow() {
  const { items, clearCart, hydrated } = useCart();
  const router = useRouter();
  const [step, setStep] = useState<"address" | "rates" | "confirm">("address");
  const [recipient, setRecipient] = useState<CheckoutRecipient>({
    name: "",
    address1: "",
    address2: "",
    city: "",
    stateCode: "JAL",
    countryCode: "MX",
    zip: "",
    phone: "",
    email: "",
  });
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [shippingMethod, setShippingMethod] = useState("STANDARD");
  const [saveAccount, setSaveAccount] = useState(false);
  const [totals, setTotals] = useState({
    subtotal: "0.00",
    shipping: "0.00",
    tax: "0.00",
    total: "0.00",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cartItems = items.map((i) => ({
    variantId: i.variantId,
    quantity: i.quantity,
    retailPriceMxn: i.retailPriceMxn,
  }));

  const productSubtotal = useMemo(
    () =>
      items
        .reduce((sum, i) => sum + Number.parseFloat(i.retailPriceMxn) * i.quantity, 0)
        .toFixed(2),
    [items],
  );

  const address = {
    address1: recipient.address1,
    address2: recipient.address2,
    city: recipient.city,
    stateCode: recipient.stateCode,
    countryCode: "MX" as const,
    zip: recipient.zip,
  };

  const displayTotals =
    step === "confirm"
      ? totals
      : {
          subtotal: productSubtotal,
          shipping: step === "rates" ? totals.shipping : "0.00",
          tax: "0.00",
          total: productSubtotal,
        };

  async function handleAddressSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetchShippingRates({
        items: cartItems,
        address,
        recipient: {
          name: recipient.name,
          phone: recipient.phone,
          email: recipient.email,
        },
      });
      if (res.data.rates.length === 0) {
        setError("No hay opciones de envío para esta dirección.");
        return;
      }
      setRates(res.data.rates);
      setShippingMethod(res.data.rates[0]?.id ?? "STANDARD");
      setStep("rates");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cotizar envío");
    } finally {
      setBusy(false);
    }
  }

  async function handleRatesContinue() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetchEstimate({ items: cartItems, shippingMethod, address });
      setTotals(res.data);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al estimar totales");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateOrder() {
    setBusy(true);
    setError(null);
    try {
      const res = await createDraftOrder({
        items: cartItems,
        shippingMethod,
        recipient,
        retailCosts: { currency: "MXN", ...totals },
        saveAccount,
      });
      clearCart();
      router.push(`/pedido/${res.data.internalOrderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear pedido");
    } finally {
      setBusy(false);
    }
  }

  if (!hydrated) {
    return <p className="text-sm text-muted-foreground">Cargando carrito…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 bg-card rounded-3xl boty-shadow">
        <p className="text-muted-foreground mb-4">Tu carrito está vacío</p>
        <Link
          href="/shop"
          className="inline-flex bg-primary text-primary-foreground px-8 py-3 rounded-full text-sm hover:bg-primary/90 boty-transition"
        >
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        <div className="bg-card rounded-3xl p-6 boty-shadow">
          <h2 className="font-serif text-xl mb-4">Tu pedido</h2>
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.variantId} className="flex justify-between text-sm">
                <div>
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-muted-foreground">
                    {item.variantLabel} × {item.quantity}
                  </p>
                </div>
                <span>
                  {formatMxn(Number.parseFloat(item.retailPriceMxn) * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {step === "address" && (
          <form
            onSubmit={(e) => void handleAddressSubmit(e)}
            className="bg-card rounded-3xl p-6 boty-shadow flex flex-col gap-3"
          >
            <h2 className="font-serif text-xl mb-2">Dirección de envío (MX)</h2>
            <Field label="Nombre" value={recipient.name} onChange={(v) => setRecipient({ ...recipient, name: v })} required />
            <Field label="Email" type="email" value={recipient.email} onChange={(v) => setRecipient({ ...recipient, email: v })} required />
            <Field label="Teléfono" value={recipient.phone} onChange={(v) => setRecipient({ ...recipient, phone: v })} required />
            <Field label="Calle y número" value={recipient.address1} onChange={(v) => setRecipient({ ...recipient, address1: v })} required />
            <Field label="Colonia (opcional)" value={recipient.address2 ?? ""} onChange={(v) => setRecipient({ ...recipient, address2: v })} />
            <Field label="Ciudad" value={recipient.city} onChange={(v) => setRecipient({ ...recipient, city: v })} required />
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Estado</span>
              <select
                value={recipient.stateCode}
                onChange={(e) => setRecipient({ ...recipient, stateCode: e.target.value })}
                className="rounded-xl border border-border bg-background px-3 py-2"
              >
                {MX_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <Field label="C.P. (5 dígitos)" value={recipient.zip} onChange={(v) => setRecipient({ ...recipient, zip: v })} required pattern="\d{5}" />
            <label className="flex items-start gap-2 text-sm mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={saveAccount}
                onChange={(e) => setSaveAccount(e.target.checked)}
                className="mt-1"
              />
              <span>
                Guardar mis datos para pedidos futuros (sin contraseña por ahora; usamos tu correo).
              </span>
            </label>
            <button
              type="submit"
              disabled={busy}
              className="mt-2 bg-primary text-primary-foreground py-3 rounded-full font-medium hover:bg-primary/90 boty-transition disabled:opacity-60"
            >
              {busy ? "Cotizando…" : "Cotizar envío"}
            </button>
          </form>
        )}

        {step === "rates" && (
          <div className="bg-card rounded-3xl p-6 boty-shadow">
            <h3 className="font-serif text-xl mb-4">Opciones de envío</h3>
            <div className="flex flex-col gap-2 mb-4">
              {rates.map((rate) => (
                <button
                  key={rate.id}
                  type="button"
                  onClick={() => setShippingMethod(rate.id)}
                  className={cn(
                    "flex items-center justify-between rounded-2xl p-4 text-left boty-transition",
                    shippingMethod === rate.id
                      ? "bg-primary/10 ring-1 ring-primary/40"
                      : "bg-background hover:bg-background/80",
                  )}
                >
                  <div>
                    <p className="font-medium">{rate.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {rate.minDays}–{rate.maxDays} días
                    </p>
                  </div>
                  <span className="font-semibold">{formatMxn(rate.priceMxn)}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void handleRatesContinue()}
              disabled={busy}
              className="w-full bg-primary text-primary-foreground py-3 rounded-full font-medium hover:bg-primary/90 boty-transition disabled:opacity-60"
            >
              {busy ? "Calculando…" : "Continuar al resumen"}
            </button>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="bg-card rounded-3xl p-6 boty-shadow h-fit">
        <h3 className="font-serif text-xl mb-4">Resumen</h3>
        <dl className="flex flex-col gap-2 text-sm mb-6">
          <Row label="Subtotal" value={formatMxn(displayTotals.subtotal)} />
          <Row label="Envío" value={formatMxn(displayTotals.shipping)} />
          <Row label="IVA (16%)" value={formatMxn(displayTotals.tax)} />
          <Row label="Total" value={formatMxn(displayTotals.total)} strong />
        </dl>
        {step === "confirm" && (
          <>
            <button
              type="button"
              onClick={() => void handleCreateOrder()}
              disabled={busy}
              className="w-full bg-primary text-primary-foreground py-4 rounded-full font-medium hover:bg-primary/90 boty-transition disabled:opacity-60"
            >
              {busy ? "Registrando pedido…" : "Confirmar pedido"}
            </button>
            <p className="mt-4 text-xs text-muted-foreground">
              No se cobrará en línea aún. Te contactaremos para confirmar pago y producción.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  pattern,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  pattern?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        pattern={pattern}
        className="rounded-xl border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30"
      />
    </label>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-bold text-lg" : "font-medium"}>{value}</dd>
    </div>
  );
}
