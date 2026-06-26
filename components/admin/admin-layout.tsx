"use client";

import {
  ClipboardList,
  LogOut,
  RefreshCw,
  Shirt,
  LayoutDashboard,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminSessionUser } from "@/lib/admin-session";
import { Logo } from "@/components/ui/Logo";

export type AdminTab = "dashboard" | "orders" | "products" | "users";
// | "prototypes" | "designs" — ocultos temporalmente

const BASE_TABS: { id: AdminTab; label: string; icon: typeof ClipboardList; description: string; devOnly?: boolean }[] = [
  { id: "dashboard", label: "Resumen", icon: LayoutDashboard, description: "Ventas y reportes" },
  { id: "orders", label: "Pedidos", icon: ClipboardList, description: "Gestión y envíos" },
  { id: "products", label: "Productos", icon: Shirt, description: "Catálogo tienda" },
  { id: "users", label: "Usuarios", icon: Users, description: "Roles y accesos", devOnly: true },
];

function getTabs(role: AdminSessionUser["role"]) {
  return BASE_TABS.filter((t) => !t.devOnly || role === "dev");
}

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
  const TABS = getTabs(user.role);

  return (
    <div className="min-h-screen bg-[#F5F0E6]">
      <div className="lg:flex">
        {/* Sidebar desktop — dark, matches brand aesthetic */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#2A2726]">
          {/* Brand header */}
          <div className="px-6 py-5 border-b border-[#f8f9fa]/10">
            <Logo color="#f8f9fa" className="w-28 mb-4" />
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#f8f9fa]/40 font-sans">
              Panel Admin
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[11px] text-[#f8f9fa]/55 truncate font-sans">{user.email}</p>
              {user.role === "dev" && (
                <span className="shrink-0 text-[9px] font-sans px-1.5 py-0.5 bg-[#5C1A24] text-[#f8f9fa] uppercase tracking-widest">
                  dev
                </span>
              )}
            </div>
          </div>

          {/* Nav items — left border indicator, no rounded corners */}
          <nav className="flex-1 py-2">
            {TABS.map(({ id, label, icon: Icon, description }) => (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                className={cn(
                  "w-full flex items-center gap-3 px-6 py-3.5 text-left boty-transition border-l-2",
                  tab === id
                    ? "border-[#5C1A24] bg-[#f8f9fa]/5 text-[#f8f9fa]"
                    : "border-transparent text-[#f8f9fa]/45 hover:text-[#f8f9fa]/75 hover:bg-[#f8f9fa]/4",
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>
                  <span className="block text-[11px] tracking-[0.16em] uppercase font-sans">{label}</span>
                  <span className={cn(
                    "block text-[10px] mt-0.5 font-sans",
                    tab === id ? "text-[#f8f9fa]/45" : "text-[#f8f9fa]/28",
                  )}>
                    {description}
                  </span>
                </span>
              </button>
            ))}
          </nav>

          {/* Bottom actions */}
          <div className="py-3 border-t border-[#f8f9fa]/10">
            <button
              type="button"
              onClick={onRefresh}
              disabled={busy}
              className="w-full flex items-center gap-2.5 px-6 py-2.5 text-[10px] tracking-[0.18em] uppercase font-sans text-[#f8f9fa]/40 hover:text-[#f8f9fa]/70 boty-transition disabled:opacity-25"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 shrink-0", busy && "animate-spin")} />
              Actualizar datos
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-2.5 px-6 py-2.5 text-[10px] tracking-[0.18em] uppercase font-sans text-[#f8f9fa]/40 hover:text-[#f8f9fa]/70 boty-transition"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Content area */}
        <div className="lg:pl-64 flex-1 min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-40 border-b border-[#D4CFC5] bg-[#F5F0E6] px-4 sm:px-8 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="lg:hidden">
                  <Logo color="#2A2726" className="w-24" />
                </div>
                <div>
                  <p className="font-serif text-xl text-[#2A2726]">
                    {TABS.find((t) => t.id === tab)?.label ?? "Admin"}
                  </p>
                  <p className="text-[10px] tracking-[0.2em] uppercase font-sans text-[#2A2726]/45 mt-0.5 hidden sm:block">
                    {TABS.find((t) => t.id === tab)?.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={busy}
                  className="lg:hidden p-2 border border-[#D4CFC5] text-[#2A2726]/55 hover:text-[#2A2726] boty-transition disabled:opacity-35"
                  aria-label="Actualizar"
                >
                  <RefreshCw className={cn("w-4 h-4", busy && "animate-spin")} />
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="lg:hidden p-2 border border-[#D4CFC5] text-[#2A2726]/55 hover:text-[#2A2726] boty-transition"
                  aria-label="Salir"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mobile tabs — rectangular, no rounded corners */}
            <nav className="lg:hidden flex mt-4 overflow-x-auto border border-[#D4CFC5]">
              {TABS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onTabChange(id)}
                  className={cn(
                    "px-4 py-2.5 text-[10px] tracking-[0.18em] uppercase font-sans whitespace-nowrap shrink-0 boty-transition border-r border-[#D4CFC5] last:border-r-0",
                    tab === id
                      ? "bg-[#2A2726] text-[#f8f9fa]"
                      : "text-[#2A2726]/55 hover:text-[#2A2726]",
                  )}
                >
                  {label}
                </button>
              ))}
            </nav>
          </header>

          <main className="w-full min-w-0 p-4 sm:p-6 lg:p-8">
            {error && (
              <div className="mb-6 text-sm text-[#DC2626] bg-[#DC2626]/8 px-4 py-3 border border-[#DC2626]/20 font-sans">
                {error}
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
