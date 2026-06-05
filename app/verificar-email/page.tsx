"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { verifyCustomerEmail } from "@/lib/customer-api";
import { AuthCard, AuthShell } from "@/components/boty/auth-shell";
import { BotyButton } from "@/components/boty/ui-patterns";

function VerifyEmailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Enlace de verificación incompleto.");
      return;
    }

    let cancelled = false;
    verifyCustomerEmail(token)
      .then((res) => {
        if (cancelled) return;
        setStatus("success");
        setMessage(res.message ?? "Correo verificado correctamente.");
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "No se pudo verificar el correo.");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthShell variant="customer">
      <AuthCard>
        <div className="text-center space-y-4 py-4">
          {status === "loading" && (
            <>
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground text-sm">Verificando tu correo…</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h1 className="font-serif text-2xl">¡Correo verificado!</h1>
              <p className="text-sm text-muted-foreground">{message}</p>
              <BotyButton
                type="button"
                variant="primary"
                size="lg"
                className="w-full mt-4"
                onClick={() => router.push("/login")}
              >
                Iniciar sesión
              </BotyButton>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="w-12 h-12 text-destructive mx-auto" />
              <h1 className="font-serif text-2xl">No se pudo verificar</h1>
              <p className="text-sm text-muted-foreground">{message}</p>
              <div className="flex flex-col gap-2 mt-4">
                <Link
                  href="/registro/verificar"
                  className="text-primary text-sm font-medium hover:underline"
                >
                  Solicitar nuevo enlace
                </Link>
                <Link href="/login" className="text-muted-foreground text-sm hover:underline">
                  Ir a iniciar sesión
                </Link>
              </div>
            </>
          )}
        </div>
      </AuthCard>
    </AuthShell>
  );
}

export default function VerificarEmailPage() {
  return (
    <Suspense fallback={<p className="text-center py-20 text-muted-foreground text-sm">Cargando…</p>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
