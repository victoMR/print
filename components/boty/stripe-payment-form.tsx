"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("checkout.paymentForm");
  const stateName = mxStateLabel(billing.state) ?? billing.state;
  return (
    <div className="rounded-2xl bg-muted/40 border border-border/50 px-4 py-3 text-sm space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {t("billingSummaryLabel")}
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
    </div>
  );
}

// ── Inner form (must be inside <Elements>) ────────────────────────────────────

function InnerPaymentForm({
  publicOrderId,
  currency,
  billing,
  returnUrl,
  onSuccess,
  onError,
}: {
  publicOrderId: string;
  currency: "MXN" | "USD";
  billing: StripeCheckoutBilling;
  returnUrl?: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const t = useTranslations("checkout.paymentForm");
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
    let paymentSucceeded = false;

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        const msg = submitError.message ?? t("cardErrorFallback");
        setMessage(msg);
        onError(msg);
        return;
      }

      const market = currency === "USD" ? "us" : "mx";
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url:
            returnUrl ??
            `${window.location.origin}/${market}/pedido/${encodeURIComponent(publicOrderId)}?paid=1`,
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
        const msg = error.message ?? t("paymentErrorFallback");
        setMessage(msg);
        onError(msg);
        return;
      }

      paymentSucceeded = true;
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("unexpectedError");
      setMessage(msg);
      onError(msg);
    } finally {
      if (!paymentSucceeded) setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <BillingSummary billing={billing} />

      <PaymentElement
        onReady={() => setElementReady(true)}
        options={{
          layout: "accordion",
          defaultValues: {
            billingDetails: {
              email: billing.email,
              name: billing.name,
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
        {busy ? t("processing") : t("payNow")}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        {t("secureNotice")}
      </p>
    </form>
  );
}

// ── Public wrapper — fetches clientSecret, mounts Elements ───────────────────

export function StripePaymentForm({
  publicOrderId,
  totalMxn,
  currency = "MXN",
  billing,
  returnUrl,
  onSuccess,
  onError,
}: {
  publicOrderId: string;
  totalMxn: string;
  currency?: "MXN" | "USD";
  billing: StripeCheckoutBilling;
  returnUrl?: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const t = useTranslations("checkout.paymentForm");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    createPaymentIntent(publicOrderId)
      .then(({ clientSecret: cs }) => { if (!cancelled) setClientSecret(cs); })
      .catch((err) => {
        if (!cancelled) setInitError(err instanceof Error ? err.message : t("initError"));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable per locale
  }, [publicOrderId]);

  if (!stripePromise) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-muted-foreground text-sm">
          {t("notConfigured")}
        </p>
        <button
          type="button"
          onClick={onSuccess}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-medium"
        >
          {t("confirmWithoutOnlinePayment")}
        </button>
      </div>
    );
  }

  if (loading) return <p className="text-center text-muted-foreground text-sm py-6">{t("preparing")}</p>;
  if (initError) return <p className="text-sm text-destructive">{initError}</p>;
  if (!clientSecret) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="font-medium text-sm">{t("totalToPay")}</p>
        <p className="font-semibold text-lg">{totalMxn}</p>
      </div>
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          locale: currency === "USD" ? "en" : "es-419",
          appearance: { theme: "stripe", variables: { borderRadius: "12px" } },
        }}
      >
        <InnerPaymentForm
          publicOrderId={publicOrderId}
          currency={currency}
          billing={billing}
          returnUrl={returnUrl}
          onSuccess={onSuccess}
          onError={onError}
        />
      </Elements>
    </div>
  );
}
