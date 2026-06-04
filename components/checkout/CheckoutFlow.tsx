"use client";

import { AddressForm } from "@/components/checkout/AddressForm";
import { CheckoutCartSummary } from "@/components/checkout/CheckoutCartSummary";
import { OrderTotals, ShippingOptions } from "@/components/checkout/CheckoutSummary";
import { CartView } from "@/components/cart/CartView";
import { GlassButton } from "@/components/ui/GlassButton";
import { createDraftOrder, fetchEstimate, fetchShippingRates } from "@/lib/api";
import type { CheckoutRecipient, ShippingRate } from "@/lib/api-types";
import { useCart } from "@/lib/cart-context";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export function CheckoutFlow() {
  const { items, clearCart, hydrated } = useCart();
  const router = useRouter();
  const [step, setStep] = useState<"address" | "rates" | "confirm">("address");
  const [recipient, setRecipient] = useState<CheckoutRecipient>({
    name: "", address1: "", address2: "", city: "",
    stateCode: "JAL", countryCode: "MX", zip: "", phone: "", email: "",
  });
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [shippingMethod, setShippingMethod] = useState("STANDARD");
  const [totals, setTotals] = useState({ subtotal: "0.00", shipping: "0.00", tax: "0.00", total: "0.00" });
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

  async function handleAddressSubmit() {
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
        setError("No hay opciones de envío disponibles para esta dirección. Verifica el código postal.");
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
      const res = await fetchEstimate({ items: cartItems, address });
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
        recipient,
        retailCosts: { currency: "MXN", ...totals },
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
    return <p className="text-sm text-foreground/60">Cargando carrito…</p>;
  }

  if (items.length === 0) return <CartView />;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        <CheckoutCartSummary items={items} />
        {step === "address" && (
          <AddressForm recipient={recipient} onChange={setRecipient} onSubmit={() => void handleAddressSubmit()} busy={busy} />
        )}
        {step === "rates" && (
          <>
            <ShippingOptions rates={rates} selected={shippingMethod} onSelect={setShippingMethod} />
            <GlassButton variant="primary" onClick={() => void handleRatesContinue()}>
              {busy ? "Calculando…" : "Continuar al resumen"}
            </GlassButton>
          </>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
      <OrderTotals
        {...displayTotals}
        step={step}
        onSubmit={() => void handleCreateOrder()}
        busy={busy}
      />
    </div>
  );
}
