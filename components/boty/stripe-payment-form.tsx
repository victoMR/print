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

const stripePromise =
  typeof window !== "undefined" && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    : null;

// ── Inner form (must be inside <Elements>) ────────────────────────────────────

function InnerPaymentForm({
  publicOrderId,
  onSuccess,
  onError,
}: {
  publicOrderId: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setBusy(true);
    setMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/pedido/${publicOrderId}?paid=1`,
      },
      redirect: "if_required",
    });

    if (error) {
      const msg = error.message ?? "Error al procesar el pago";
      setMessage(msg);
      onError(msg);
      setBusy(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <PaymentElement
        options={{
          layout: "tabs",
          fields: { billingDetails: { address: "never" } },
        }}
      />

      {message && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{message}</p>
      )}

      <button
        type="submit"
        disabled={busy || !stripe}
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
  onSuccess,
  onError,
}: {
  publicOrderId: string;
  totalMxn: string;
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
          onSuccess={onSuccess}
          onError={onError}
        />
      </Elements>
    </div>
  );
}
