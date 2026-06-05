"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { resendVerificationEmail } from "@/lib/customer-api";
import { AuthCard, AuthShell } from "@/components/boty/auth-shell";
import { BotyAlert, BotyButton, BotyInput, BotyLabel } from "@/components/boty/ui-patterns";

function VerifyPendingContent() {
  const params = useSearchParams();
  const initialEmail = params.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <AuthShell variant="customer">
      <AuthCard>
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-serif text-3xl mb-2">Confirma tu correo</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Te enviamos un enlace de verificación. Ábrelo para activar tu cuenta y poder iniciar sesión.
          </p>
        </div>

        {initialEmail && (
          <p className="text-sm text-center mb-6">
            Correo: <strong>{initialEmail}</strong>
          </p>
        )}

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
