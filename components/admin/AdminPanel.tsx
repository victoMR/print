"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminDeleteDesign,
  adminListDesigns,
  adminUploadDesign,
  adminFetchMe,
} from "@/lib/api";
import type { AdminDesign } from "@/lib/api-types";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminOrdersSection } from "@/components/admin/admin-orders-section";
import { AdminProductsSection } from "@/components/admin/AdminProductsSection";
import { ProductComposer } from "@/components/admin/ProductComposer";
import { AdminLayout, type AdminTab } from "@/components/admin/admin-layout";
import { clearAdminToken, type AdminSessionUser } from "@/lib/admin-session";
import {
  BotyBadge,
  BotyButton,
  BotyInput,
  BotyLabel,
  BotySelect,
  BotySurface,
  BotyTextarea,
} from "@/components/boty/ui-patterns";
import { Loader2 } from "lucide-react";

export function AdminPanel() {
  const [user, setUser] = useState<AdminSessionUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState<AdminTab>("orders");
  const [prototypeProductId, setPrototypeProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [designs, setDesigns] = useState<AdminDesign[]>([]);
  const [ordersRefresh, setOrdersRefresh] = useState(0);
  const [busy, setBusy] = useState(false);

  const [designForm, setDesignForm] = useState({ name: "", description: "" });
  const [designFile, setDesignFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      if (tab === "designs") {
        const res = await adminListDesigns();
        setDesigns(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    }
  }, [tab]);

  useEffect(() => {
    void adminFetchMe()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [load, user]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-muted-foreground text-sm bg-[#f4f1ec]">
        <Loader2 className="w-4 h-4 animate-spin" />
        Verificando sesión…
      </div>
    );
  }

  if (!user) {
    return <AdminLogin onSuccess={setUser} />;
  }

  function handleLogout() {
    clearAdminToken();
    setUser(null);
  }

  async function handleCreateDesign(e: React.FormEvent) {
    e.preventDefault();
    if (!designFile) {
      setError("Selecciona un archivo PNG, JPG, WebP, SVG o PDF.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminUploadDesign(designFile, {
        name: designForm.name || undefined,
        description: designForm.description || undefined,
      });
      setDesignForm({ name: "", description: "" });
      setDesignFile(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir diseño");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminLayout
      user={user}
      tab={tab}
      onTabChange={setTab}
      onLogout={handleLogout}
      onRefresh={() => {
        void load();
        setOrdersRefresh((n) => n + 1);
      }}
      busy={busy}
      error={error}
    >
      {tab === "orders" && (
        <AdminOrdersSection
          busy={busy}
          setBusy={setBusy}
          onError={setError}
          refreshKey={ordersRefresh}
        />
      )}

      {tab === "products" && (
        <AdminProductsSection busy={busy} setBusy={setBusy} onError={setError} />
      )}

      {tab === "prototypes" && (
        <div className="space-y-4">
          <BotySurface className="p-5">
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Crea mockups de referencia para enviar a imprentas locales. No sustituye la foto del
              producto en la tienda — eso se sube en <strong className="text-foreground">Productos</strong> cuando
              tengas la prenda terminada.
            </p>
          </BotySurface>
          <ProductComposer
            busy={busy}
            setBusy={setBusy}
            onError={setError}
            editProductId={prototypeProductId}
            onEditDone={() => setPrototypeProductId(null)}
            prototypeMode
          />
        </div>
      )}

      {tab === "designs" && (
        <section className="grid gap-8 lg:grid-cols-[minmax(280px,360px)_1fr]">
          <form onSubmit={(e) => void handleCreateDesign(e)} className="contents">
            <BotySurface className="p-6 h-fit space-y-4">
              <h2 className="font-serif text-xl">Nuevo diseño</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                PNG, JPG, WebP, SVG o PDF. HEIC: convierte a PNG antes de subir.
              </p>
              <BotyInput
                placeholder="Nombre (opcional)"
                value={designForm.name}
                onChange={(e) => setDesignForm({ ...designForm, name: e.target.value })}
              />
              <input
                required
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf"
                onChange={(e) => setDesignFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-2xl border border-dashed border-border/80 bg-background/50 px-4 py-4 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground file:text-xs"
              />
              {designFile && (
                <p className="text-xs text-muted-foreground truncate">{designFile.name}</p>
              )}
              <BotyTextarea
                placeholder="Descripción (opcional)"
                value={designForm.description}
                onChange={(e) => setDesignForm({ ...designForm, description: e.target.value })}
              />
              <BotyButton type="submit" variant="primary" className="w-full" disabled={busy}>
                Guardar diseño
              </BotyButton>
            </BotySurface>
          </form>

          <ul className="space-y-3">
            {designs.length === 0 ? (
              <BotySurface className="p-10 text-center text-sm text-muted-foreground">
                No hay diseños aún.
              </BotySurface>
            ) : (
              designs.map((d) => (
                <li key={d.id}>
                  <BotySurface className="p-4 flex gap-4 items-center">
                    {d.thumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.thumbnailUrl} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0 ring-1 ring-border/60" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{d.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{d.fileUrl}</p>
                    </div>
                    <BotyButton
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={busy}
                      onClick={() => void adminDeleteDesign(d.id).then(load)}
                    >
                      Eliminar
                    </BotyButton>
                  </BotySurface>
                </li>
              ))
            )}
          </ul>
        </section>
      )}
    </AdminLayout>
  );
}
