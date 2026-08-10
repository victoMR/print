"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Search } from "lucide-react";
import { apiErrorMessage } from "@/lib/i18n/api-error-message";

type OrderTrackingFormProps = {
  initialTrackingCode?: string;
  initialEmail?: string;
  submitLabel?: string;
  onSubmit: (input: { trackingCode: string; email: string }) => Promise<void>;
};

export function OrderTrackingForm({
  initialTrackingCode = "",
  initialEmail = "",
  submitLabel,
  onSubmit,
}: OrderTrackingFormProps) {
  const t = useTranslations("tracking.form");
  const tRoot = useTranslations();
  const [trackingCode, setTrackingCode] = useState(initialTrackingCode);
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolvedSubmitLabel = submitLabel ?? t("submitLabel");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ trackingCode: trackingCode.trim(), email: email.trim() });
    } catch (err) {
      setError(apiErrorMessage(err, tRoot, t("queryError")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div>
        <label htmlFor="tracking-code" className="block text-sm font-medium mb-1.5">
          {t("trackingCodeLabel")}
        </label>
        <input
          id="tracking-code"
          type="text"
          value={trackingCode}
          onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
          placeholder="MRP-XXXX-XXXX-XXXX"
          autoComplete="off"
          spellCheck={false}
          required
          className="w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm font-mono tracking-wide uppercase"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          {t("trackingCodeHint")}
        </p>
      </div>

      <div>
        <label htmlFor="tracking-email" className="block text-sm font-medium mb-1.5">
          {t("emailLabel")}
        </label>
        <input
          id="tracking-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          autoComplete="email"
          required
          className="w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-2xl px-4 py-3">{error}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-full font-medium hover:bg-primary/90 boty-transition disabled:opacity-50"
      >
        {busy ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("querying")}
          </>
        ) : (
          <>
            <Search className="w-4 h-4" />
            {resolvedSubmitLabel}
          </>
        )}
      </button>
    </form>
  );
}
