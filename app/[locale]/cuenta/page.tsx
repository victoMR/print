"use client";

import { useEffect, useState } from "react";
import {
  BotyAlert,
  BotyButton,
  BotyInput,
  BotyLabel,
  BotyPageHeader,
  BotySurface,
} from "@/components/boty/ui-patterns";
import { useCustomer } from "@/lib/customer-context";
import { updateProfile } from "@/lib/customer-api";

export default function ProfilePage() {
  const { user, refresh } = useCustomer();
  const [form, setForm] = useState({ fullName: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) setForm({ fullName: user.fullName, phone: user.phone ?? "" });
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(false);
    try {
      await updateProfile({ fullName: form.fullName, phone: form.phone || null });
      await refresh();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <BotyPageHeader
        title="Mi perfil"
        description="Actualiza tu nombre y teléfono de contacto para envíos y notificaciones."
      />

      <BotySurface className="p-6 md:p-8 max-w-xl">
        <form onSubmit={(e) => void handleSave(e)} className="space-y-5">
          {success && <BotyAlert variant="success">Perfil actualizado correctamente.</BotyAlert>}
          {error && <BotyAlert variant="error">{error}</BotyAlert>}

          <label className="flex flex-col gap-2">
            <BotyLabel>Correo</BotyLabel>
            <BotyInput disabled value={user?.email ?? ""} className="bg-muted/40" />
            <span className="text-xs text-muted-foreground">El correo no se puede cambiar por seguridad.</span>
          </label>

          <label className="flex flex-col gap-2">
            <BotyLabel>Nombre completo</BotyLabel>
            <BotyInput
              required
              autoComplete="name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-2">
            <BotyLabel>Teléfono</BotyLabel>
            <BotyInput
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>

          <BotyButton type="submit" variant="primary" disabled={busy}>
            {busy ? "Guardando…" : "Guardar cambios"}
          </BotyButton>
        </form>
      </BotySurface>
    </>
  );
}
