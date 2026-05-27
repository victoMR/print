"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/catalogo", label: "Catálogo" },
];

export function GlassNav() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-6">
      <GlassCard className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent"
        >
          Print MX
        </Link>
        <nav className="flex items-center gap-1 md:gap-2">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors md:px-4",
                pathname === href
                  ? "bg-foreground/10 text-foreground"
                  : "text-foreground/70 hover:text-foreground hover:bg-foreground/5",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </GlassCard>
    </header>
  );
}
