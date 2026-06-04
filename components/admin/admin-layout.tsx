"use client";

import {
  ClipboardList,
  LogOut,
  RefreshCw,
  Shirt,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminSessionUser } from "@/lib/admin-session";

export type AdminTab = "orders" | "products";
// | "prototypes" | "designs" — ocultos temporalmente

const TABS: { id: AdminTab; label: string; icon: typeof ClipboardList; description: string }[] = [
  { id: "orders", label: "Pedidos", icon: ClipboardList, description: "Gestión y envíos" },
  { id: "products", label: "Productos", icon: Shirt, description: "Catálogo tienda" },
  // { id: "prototypes", label: "Prototipos", icon: Sparkles, description: "Referencias imprenta" },
  // { id: "designs", label: "Diseños", icon: ImageIcon, description: "Biblioteca de arte" },
];

type AdminLayoutProps = {
  user: AdminSessionUser;
  tab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onLogout: () => void;
  onRefresh: () => void;
  busy?: boolean;
  error?: string | null;
  children: React.ReactNode;
};

export function AdminLayout({
  user,
  tab,
  onTabChange,
  onLogout,
  onRefresh,
  busy,
  error,
  children,
}: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f4f1ec]">
      <div className="lg:flex">
        {/* Sidebar desktop */}
        <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 border-r border-border/80 bg-card/95 backdrop-blur-md">
          <div className="p-6 border-b border-border/60">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Panel</p>
            <h1 className="font-serif text-2xl mt-1">Mr. Paps</h1>
            <p className="text-xs text-muted-foreground mt-2 truncate">{user.email}</p>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {TABS.map(({ id, label, icon: Icon, description }) => (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-3 rounded-2xl text-left boty-transition",
                  tab === id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                <span>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className={cn("block text-xs mt-0.5", tab === id ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {description}
                  </span>
                </span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-border/60 space-y-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm border border-border/80 hover:bg-background boty-transition disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", busy && "animate-spin")} />
              Actualizar datos
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm text-muted-foreground hover:bg-destructive/5 hover:text-destructive boty-transition"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Contenido */}
        <div className="lg:pl-72 flex-1 min-w-0">
          {/* Top bar móvil + desktop */}
          <header className="sticky top-0 z-40 border-b border-border/60 bg-card/90 backdrop-blur-md px-4 sm:px-8 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="lg:hidden w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-serif text-xl lg:text-2xl">
                    {TABS.find((t) => t.id === tab)?.label ?? "Admin"}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {TABS.find((t) => t.id === tab)?.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={busy}
                  className="lg:hidden p-2.5 rounded-xl border border-border/80 hover:bg-background disabled:opacity-50"
                  aria-label="Actualizar"
                >
                  <RefreshCw className={cn("w-4 h-4", busy && "animate-spin")} />
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="lg:hidden p-2.5 rounded-xl border border-border/80 text-muted-foreground"
                  aria-label="Salir"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs móvil */}
            <nav className="lg:hidden flex gap-2 mt-4 overflow-x-auto pb-1">
              {TABS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onTabChange(id)}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap shrink-0 boty-transition",
                    tab === id ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </nav>
          </header>

          <main className="p-4 sm:p-8 max-w-6xl">
            {error && (
              <p className="mb-6 text-sm text-destructive bg-destructive/10 rounded-2xl px-4 py-3 border border-destructive/20">
                {error}
              </p>
            )}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
