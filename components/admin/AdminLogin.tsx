"use client";

import { useState } from "react";
import { adminLogin } from "@/lib/api";
import { setAdminToken } from "@/lib/admin-session";
import type { AdminSessionUser } from "@/lib/admin-session";

type AdminLoginProps = {
  onSuccess: (user: AdminSessionUser) => void;
};

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="bg-card rounded-3xl p-8 boty-shadow border border-border/60">
        <h1 className="font-serif text-2xl mb-2">Admin Mr. Paps</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Inicia sesión con tu cuenta de administrador.
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Correo</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Contraseña</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2"
            />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-primary text-primary-foreground py-3 rounded-full font-medium disabled:opacity-60"
          >
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
