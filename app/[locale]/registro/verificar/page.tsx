"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { fetchEmailVerificationStatus, resendVerificationEmail } from "@/lib/customer-api";
import { apiErrorMessage } from "@/lib/i18n/api-error-message";
import { AuthCard, AuthShell } from "@/components/boty/auth-shell";
import { BotyAlert, BotyButton, BotyInput, BotyLabel } from "@/components/boty/ui-patterns";

const POLL_INTERVAL_MS = 5_000;
const REDIRECT_DELAY_MS = 2_500;

function VerifyPendingContent() {
  const t = useTranslations("emailVerification");
  const tPending = useTranslations("emailVerification.pending");
  const tRoot = useTranslations();
  const params = useSearchParams();
  const router = useRouter();
  const initialEmail = params.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const pollEmailRef = useRef(initialEmail);

  useEffect(() => {
    pollEmailRef.current = email.trim().toLowerCase() || initialEmail.trim().toLowerCase();
  }, [email, initialEmail]);

  useEffect(() => {
    const targetEmail = initialEmail.trim().toLowerCase();
    if (!targetEmail || verified) return;

    let cancelled = false;

    async function checkStatus() {
      const current = pollEmailRef.current || targetEmail;
      if (!current) return;
      try {
        const res = await fetchEmailVerificationStatus(current);
        if (cancelled || !res.data.verified) return;
        setVerified(true);
        setError(null);
        setMessage(tPending("verifiedRedirectMessage"));
      } catch {
        // Polling silencioso; el usuario puede reenviar si hay problema
      }
    }

    void checkStatus();
    const timer = window.setInterval(() => void checkStatus(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [initialEmail, verified]);

  useEffect(() => {
    if (!verified) return;
    const timer = window.setTimeout(() => {
      router.push("/login");
    }, REDIRECT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [verified, router]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await resendVerificationEmail(email.trim().toLowerCase());
      setMessage(tPending("resendSuccess"));
    } catch (err) {
      setError(apiErrorMessage(err, tRoot, tPending("resendErrorFallback")));
    } finally {
      setBusy(false);
    }
  }

  if (verified) {
    return (
      <AuthShell variant="customer">
        <AuthCard>
          <div className="text-center space-y-4 py-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h1 className="font-serif text-2xl">{t("verifiedTitle")}</h1>
            <p className="text-sm text-muted-foreground">
              {tPending("activeAccountMessage")}
            </p>
            <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
          </div>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell variant="customer">
      <AuthCard>
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-serif text-3xl mb-2">{tPending("confirmEmailTitle")}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {tPending("confirmEmailSubtitle")}
          </p>
        </div>

        {initialEmail && (
          <p className="text-sm text-center mb-4">
            {tPending("emailLabel")} <strong>{initialEmail}</strong>
          </p>
        )}

        <p className="text-xs text-center text-muted-foreground mb-6 flex items-center justify-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          {tPending("waitingConfirmation")}
        </p>

        <form onSubmit={(e) => void handleResend(e)} className="space-y-4">
          {error && <BotyAlert variant="error">{error}</BotyAlert>}
          {message && <BotyAlert variant="success">{message}</BotyAlert>}

          <label className="flex flex-col gap-2">
            <BotyLabel>{tPending("resendLabel")}</BotyLabel>
            <BotyInput
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
            />
          </label>

          <BotyButton type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
            {busy ? tPending("sending") : tPending("resendLink")}
          </BotyButton>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-8 pt-6 border-t border-border/50">
          {tPending("alreadyVerified")}{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            {tPending("login")}
          </Link>
        </p>
      </AuthCard>
    </AuthShell>
  );
}

export default function RegistroVerificarPage() {
  return (
    <Suspense fallback={<VerifyPendingFallback />}>
      <VerifyPendingContent />
    </Suspense>
  );
}

function VerifyPendingFallback() {
  const t = useTranslations("emailVerification");
  return <p className="text-center py-20 text-muted-foreground text-sm">{t("loading")}</p>;
}
