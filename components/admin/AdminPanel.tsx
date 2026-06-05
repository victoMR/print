"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetchMe } from "@/lib/api";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminOrdersSection } from "@/components/admin/admin-orders-section";
import { AdminProductsSection } from "@/components/admin/AdminProductsSection";
import { AdminUsersSection } from "@/components/admin/AdminUsersSection";
import { AdminLayout, type AdminTab } from "@/components/admin/admin-layout";
import { clearAdminToken, type AdminSessionUser } from "@/lib/admin-session";
import { Loader2 } from "lucide-react";

export function AdminPanel() {
  const [user, setUser] = useState<AdminSessionUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState<AdminTab>("orders");
  const [error, setError] = useState<string | null>(null);
  const [ordersRefresh, setOrdersRefresh] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    // if (tab === "designs") { ... } — pestaña diseños oculta
  }, []);

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

      {tab === "users" && user.role === "dev" && (
        <AdminUsersSection />
      )}

      {/* Prototipos y diseños — ocultos temporalmente
      {tab === "prototypes" && (
        <div className="space-y-4">
          <BotySurface className="p-5">...</BotySurface>
          <ProductComposer prototypeMode ... />
        </div>
      )}

      {tab === "designs" && (
        <section className="grid gap-8 lg:grid-cols-[minmax(280px,360px)_1fr]">...</section>
      )}
      */}
    </AdminLayout>
  );
}
