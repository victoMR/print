"use client";

import { Link, usePathname, useRouter } from "@/lib/i18n/navigation";
import { User, Package, MapPin, LogOut, ChevronRight, Loader2 } from "lucide-react";
import { useCustomer } from "@/lib/customer-context";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/cuenta", label: "Mi perfil", icon: User },
  { href: "/cuenta/pedidos", label: "Mis pedidos", icon: Package },
  { href: "/cuenta/direcciones", label: "Direcciones", icon: MapPin },
] as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Sidebar y guard de sesión — el Header/Footer viven en app/cuenta/layout.tsx */
export function AccountShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useCustomer();
  const pathname = usePathname();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm py-24">
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando tu cuenta…
      </div>
    );
  }

  if (!user) {
    router.replace(`/login?redirect=${pathname}`);
    return null;
  }

  function handleLogout() {
    logout();
    router.push("/");
  }

  const firstName = user.fullName.split(" ")[0];

  return (
    <div className="max-w-6xl mx-auto w-full">
      <div className="lg:hidden mb-6 rounded-3xl border border-white/60 bg-card/90 backdrop-blur-md p-5 boty-shadow">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-serif text-xl">
            {initials(user.fullName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Mi cuenta</p>
            <p className="font-serif text-xl truncate">Hola, {firstName}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-28 rounded-3xl border border-white/60 bg-card/90 backdrop-blur-md p-5 boty-shadow space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-serif text-lg">
                {initials(user.fullName)}
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{user.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>

            <nav className="flex flex-col gap-1">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm boty-transition group",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 font-medium">{label}</span>
                    <ChevronRight
                      className={cn(
                        "w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-50 group-hover:translate-x-0 boty-transition",
                        active && "opacity-70 translate-x-0",
                      )}
                    />
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-sm text-muted-foreground hover:bg-destructive/5 hover:text-destructive boty-transition"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <nav className="lg:hidden flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm whitespace-nowrap boty-transition shrink-0",
                  pathname === href
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border/60 text-muted-foreground",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm text-muted-foreground border border-border/60 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              Salir
            </button>
          </nav>
          {children}
        </div>
      </div>
    </div>
  );
}

/** @deprecated Usar AccountShell; el layout de ruta ya incluye Header/Footer */
export function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
