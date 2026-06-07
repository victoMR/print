"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetchMe, adminLogout, adminRefreshSession } from "@/lib/api";
import { ADMIN_LOGIN_PATH } from "@/lib/safe-redirect";
import { broadcastSession, subscribeSession } from "@/lib/session-broadcast";
import { useSessionKeepalive } from "@/lib/use-session-keepalive";
import { AdminDashboardSection } from "@/components/admin/admin-dashboard-section";
import { AdminOrdersSection } from "@/components/admin/admin-orders-section";
import { AdminProductsSection } from "@/components/admin/AdminProductsSection";
import { AdminUsersSection } from "@/components/admin/AdminUsersSection";
import { AdminLayout, type AdminTab } from "@/components/admin/admin-layout";
import { clearAdminToken, type AdminSessionUser } from "@/lib/admin-session";
import { Loader2 } from "lucide-react";

export function AdminPanel() {
  const router = useRouter();
  const [user, setUser] = useState<AdminSessionUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [error, setError] = useState<string | null>(null);
  const [dashboardRefresh, setDashboardRefresh] = useState(0);
  const [ordersRefresh, setOrdersRefresh] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    // if (tab === "designs") { ... } — pestaña diseños oculta
  }, []);

  const loadSession = useCallback(async () => {
    try {
      const res = await adminFetchMe();
      setUser(res.data);
    } catch {
      setUser(null);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  const slideRefresh = useCallback(async () => {
    if (!user) return;
    const next = await adminRefreshSession();
    if (!next) {
      setUser(null);
      return;
    }
    setUser(next);
    broadcastSession({ type: "admin:refresh" });
  }, [user]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    return subscribeSession((event) => {
      if (event.type === "admin:logout") setUser(null);
      if (event.type === "admin:login" || event.type === "admin:refresh") void loadSession();
    });
  }, [loadSession]);

  useSessionKeepalive({ enabled: Boolean(user), onRefresh: slideRefresh });

  useEffect(() => {
    if (!authChecked || user) return;
    router.replace(`${ADMIN_LOGIN_PATH}?redirect=${encodeURIComponent("/admin")}`);
  }, [authChecked, user, router]);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [load, user]);

  if (!authChecked || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-muted-foreground text-sm bg-[#f4f1ec]">
        <Loader2 className="w-4 h-4 animate-spin" />
        Verificando sesión…
      </div>
    );
  }

  function handleLogout() {
    clearAdminToken();
    broadcastSession({ type: "admin:logout" });
    void adminLogout();
    setUser(null);
    router.replace(ADMIN_LOGIN_PATH);
  }

  return (
    <AdminLayout
      user={user}
      tab={tab}
      onTabChange={setTab}
      onLogout={handleLogout}
      onRefresh={() => {
        void load();
        setDashboardRefresh((n) => n + 1);
        setOrdersRefresh((n) => n + 1);
      }}
      busy={busy}
      error={error}
    >
      {tab === "dashboard" && (
        <AdminDashboardSection onError={setError} refreshKey={dashboardRefresh} />
      )}

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
