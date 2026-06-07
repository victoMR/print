"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { customerLogin } from "@/lib/customer-api";
import { validateLoginForm } from "@/lib/customer-auth-rules";
import { useCustomer } from "@/lib/customer-context";
import { broadcastSession } from "@/lib/session-broadcast";
import { ADMIN_LOGIN_PATH, isAdminPath, safeRedirectPath } from "@/lib/safe-redirect";
import { AuthCard, AuthShell } from "./auth-shell";
import { BotyAlert, BotyButton, BotyInput, BotyLabel } from "./ui-patterns";

function buildAuthHref(path: string, redirect: string) {
  const q = redirect && redirect !== path ? `?redirect=${encodeURIComponent(redirect)}` : "";
  return `${path}${q}`;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useCustomer();
  const [form, setForm] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const redirect = safeRedirectPath(params.get("redirect"), "/cuenta");
  const registerHref = buildAuthHref("/registro", redirect);

  // Si el destino es el panel admin, usar el login de admin (no el de clientes).
  useEffect(() => {
    if (isAdminPath(redirect)) {
      router.replace(
        `${ADMIN_LOGIN_PATH}?redirect=${encodeURIComponent(redirect)}`,
      );
    }
  }, [redirect, router]);

  if (isAdminPath(redirect)) {
    return (
      <p className="text-center py-20 text-muted-foreground text-sm">
        Redirigiendo al panel de administración…
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const validationError = validateLoginForm(form.email, form.password);
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    try {
      await customerLogin(form.email.trim().toLowerCase(), form.password, rememberMe);
      await refresh();
      broadcastSession({ type: "customer:login" });
      router.push(redirect);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al iniciar sesión";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell variant="customer">
      <AuthCard>
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl mb-2">Bienvenido de nuevo</h1>
          <p className="text-sm text-muted-foreground">
            Accede para ver pedidos, direcciones y pagar más rápido.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5" autoComplete="on">
          {error && <BotyAlert variant="error">{error}</BotyAlert>}

          <label className="flex flex-col gap-2">
            <BotyLabel>Correo electrónico</BotyLabel>
            <BotyInput
              required
              type="email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-2">
            <BotyLabel>Contraseña</BotyLabel>
            <div className="relative">
              <BotyInput
                required
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Ocultar" : "Mostrar"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <span className="text-sm text-muted-foreground">Recordarme en este dispositivo (30 días)</span>
          </label>

          <BotyButton type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
            {busy ? "Entrando…" : "Iniciar sesión"}
          </BotyButton>
        </form>

        {error?.includes("Confirma tu correo") && (
          <p className="text-center text-sm mt-4">
            <Link
              href={`/registro/verificar?email=${encodeURIComponent(form.email.trim().toLowerCase())}`}
              className="text-primary font-medium hover:underline"
            >
              Reenviar enlace de verificación
            </Link>
          </p>
        )}

        <p className="text-center text-sm text-muted-foreground mt-8 pt-6 border-t border-border/50">
          ¿Primera vez aquí?{" "}
          <Link href={registerHref} className="text-primary font-medium hover:underline">
            Crear cuenta gratis
          </Link>
        </p>
      </AuthCard>
    </AuthShell>
  );
}
