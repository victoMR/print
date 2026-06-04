"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { createPaymentIntent } from "@/lib/customer-api";
import { mxStateLabel } from "@/lib/mx-state-label";

const stripePromise =
  typeof window !== "undefined" && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    : null;

/** Datos de envío del checkout — se envían a Stripe al confirmar (no se piden otra vez en el Element). */
export type StripeCheckoutBilling = {
  name: string;
  email: string;
  phone: string;
  country: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
};

function BillingSummary({ billing }: { billing: StripeCheckoutBilling }) {
  const stateName = mxStateLabel(billing.state) ?? billing.state;
  return (
    <div className="rounded-2xl bg-muted/40 border border-border/50 px-4 py-3 text-sm space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Datos de facturación (del paso de envío)
      </p>
      <p className="font-medium text-foreground">{billing.name}</p>
      <p className="text-muted-foreground">{billing.email}</p>
      <p className="text-muted-foreground">
        {billing.address1}
        {billing.address2 ? `, ${billing.address2}` : ""}
      </p>
      <p className="text-muted-foreground">
        {billing.city}, {stateName} {billing.postalCode}, {billing.country}
      </p>
      <p className="text-xs text-muted-foreground pt-1">
        Solo ingresa los datos de tu tarjeta abajo; no hace falta repetir nombre ni dirección.
      </p>
    </div>
  );
}

// ── Inner form (must be inside <Elements>) ────────────────────────────────────

function InnerPaymentForm({
  publicOrderId,
  billing,
  returnUrl,
  onSuccess,
  onError,
}: {
  publicOrderId: string;
  billing: StripeCheckoutBilling;
  returnUrl?: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [elementReady, setElementReady] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setBusy(true);
    setMessage(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        const msg = submitError.message ?? "Revisa los datos de la tarjeta";
        setMessage(msg);
        onError(msg);
        return;
      }

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url:
            returnUrl ??
            `${window.location.origin}/pedido/${encodeURIComponent(publicOrderId)}?paid=1`,
          receipt_email: billing.email,
          payment_method_data: {
            billing_details: {
              name: billing.name,
              email: billing.email,
              phone: billing.phone,
              address: {
                country: billing.country,
                line1: billing.address1,
                line2: billing.address2 || undefined,
                city: billing.city,
                state: billing.state,
                postal_code: billing.postalCode,
              },
            },
          },
        },
        redirect: "if_required",
      });

      if (error) {
        const msg = error.message ?? "Error al procesar el pago";
        setMessage(msg);
        onError(msg);
        return;
      }

      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error inesperado al pagar";
      setMessage(msg);
      onError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <BillingSummary billing={billing} />

      <PaymentElement
        onReady={() => setElementReady(true)}
        options={{
          layout: "accordion",
          fields: {
            billingDetails: {
              name: "never",
              email: "never",
              phone: "never",
              address: "never",
            },
          },
          // stripe-js 5.x solo tipa applePay/googlePay; Link se controla vía layout + billing en confirm
          wallets: {
            applePay: "never",
            googlePay: "never",
          },
        }}
      />

      {message && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{message}</p>
      )}

      <button
        type="submit"
        disabled={busy || !stripe || !elementReady}
        className="w-full bg-primary text-primary-foreground py-3 rounded-full font-medium hover:bg-primary/90 disabled:opacity-60 transition-opacity"
      >
        {busy ? "Procesando pago…" : "Pagar ahora"}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        Pago seguro vía Stripe · No guardamos datos de tu tarjeta
      </p>
    </form>
  );
}

// ── Public wrapper — fetches clientSecret, mounts Elements ───────────────────

export function StripePaymentForm({
  publicOrderId,
  totalMxn,
  billing,
  returnUrl,
  onSuccess,
  onError,
}: {
  publicOrderId: string;
  totalMxn: string;
  billing: StripeCheckoutBilling;
  returnUrl?: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    createPaymentIntent(publicOrderId)
      .then(({ clientSecret: cs }) => { if (!cancelled) setClientSecret(cs); })
      .catch((err) => {
        if (!cancelled) setInitError(err instanceof Error ? err.message : "No se pudo iniciar el pago");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [publicOrderId]);

  if (!stripePromise) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-muted-foreground text-sm">
          Pagos en línea no configurados aún. Te contactaremos para coordinar el pago.
        </p>
        <button
          type="button"
          onClick={onSuccess}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-medium"
        >
          Confirmar pedido sin pago en línea
        </button>
      </div>
    );
  }

  if (loading) return <p className="text-center text-muted-foreground text-sm py-6">Preparando pago…</p>;
  if (initError) return <p className="text-sm text-destructive">{initError}</p>;
  if (!clientSecret) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="font-medium text-sm">Total a pagar</p>
        <p className="font-semibold text-lg">{totalMxn}</p>
      </div>
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          locale: "es-419",
          appearance: { theme: "stripe", variables: { borderRadius: "12px" } },
        }}
      >
        <InnerPaymentForm
          publicOrderId={publicOrderId}
          billing={billing}
          returnUrl={returnUrl}
          onSuccess={onSuccess}
          onError={onError}
        />
      </Elements>
    </div>
  );
}
