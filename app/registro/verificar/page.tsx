"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { fetchEmailVerificationStatus, resendVerificationEmail } from "@/lib/customer-api";
import { AuthCard, AuthShell } from "@/components/boty/auth-shell";
import { BotyAlert, BotyButton, BotyInput, BotyLabel } from "@/components/boty/ui-patterns";

const POLL_INTERVAL_MS = 5_000;
const REDIRECT_DELAY_MS = 2_500;

function VerifyPendingContent() {
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
        setMessage("¡Correo verificado! Te llevamos al inicio de sesión…");
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
      const res = await resendVerificationEmail(email.trim().toLowerCase());
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el correo");
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
            <h1 className="font-serif text-2xl">¡Correo verificado!</h1>
            <p className="text-sm text-muted-foreground">
              Tu cuenta ya está activa. Redirigiendo al inicio de sesión…
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
          <h1 className="font-serif text-3xl mb-2">Confirma tu correo</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Te enviamos un enlace de verificación. Ábrelo en cualquier dispositivo; esta pantalla se
            actualizará sola cuando confirmes.
          </p>
        </div>

        {initialEmail && (
          <p className="text-sm text-center mb-4">
            Correo: <strong>{initialEmail}</strong>
          </p>
        )}

        <p className="text-xs text-center text-muted-foreground mb-6 flex items-center justify-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          Esperando confirmación…
        </p>

        <form onSubmit={(e) => void handleResend(e)} className="space-y-4">
          {error && <BotyAlert variant="error">{error}</BotyAlert>}
          {message && <BotyAlert variant="success">{message}</BotyAlert>}

          <label className="flex flex-col gap-2">
            <BotyLabel>¿No llegó? Reenviar a</BotyLabel>
            <BotyInput
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
            />
          </label>

          <BotyButton type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
            {busy ? "Enviando…" : "Reenviar enlace"}
          </BotyButton>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-8 pt-6 border-t border-border/50">
          ¿Ya verificaste?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </AuthCard>
    </AuthShell>
  );
}

export default function RegistroVerificarPage() {
  return (
    <Suspense fallback={<p className="text-center py-20 text-muted-foreground text-sm">Cargando…</p>}>
      <VerifyPendingContent />
    </Suspense>
  );
}
