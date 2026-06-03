"use client";

import { useState } from "react";
import { Eye, EyeOff, Shield } from "lucide-react";
import { adminLogin } from "@/lib/api";
import { setAdminToken } from "@/lib/admin-session";
import type { AdminSessionUser } from "@/lib/admin-session";
import { AuthCard, AuthShell } from "@/components/boty/auth-shell";
import { BotyAlert, BotyButton, BotyInput, BotyLabel } from "@/components/boty/ui-patterns";

type AdminLoginProps = {
  onSuccess: (user: AdminSessionUser) => void;
};

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await adminLogin(email, password);
      setAdminToken(res.data.token);
      onSuccess(res.data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell variant="admin">
      <AuthCard>
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-7 h-7 text-primary" />
          </div>
        </div>
        <div className="text-center mb-8">
          <h1 className="font-serif text-2xl mb-2">Panel de administración</h1>
          <p className="text-sm text-muted-foreground">
            Acceso restringido para el equipo Mr. Paps.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          <label className="flex flex-col gap-2">
            <BotyLabel>Correo</BotyLabel>
            <BotyInput
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2">
            <BotyLabel>Contraseña</BotyLabel>
            <div className="relative">
              <BotyInput
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          {error && <BotyAlert variant="error">{error}</BotyAlert>}

          <BotyButton type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
            {busy ? "Verificando…" : "Entrar al panel"}
          </BotyButton>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
