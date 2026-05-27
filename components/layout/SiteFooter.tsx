import { GlassCard } from "@/components/ui/GlassCard";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="px-4 pb-8 pt-16 md:px-6">
      <GlassCard className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-foreground">Mr. Paps</p>
            <p className="mt-1 max-w-sm text-sm text-foreground/65">
              Impresión bajo demanda desde Tijuana. Precios en MXN con IVA.
              Envío 5–14 días a todo México.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/catalogo" className="text-foreground/70 hover:text-foreground">
              Catálogo
            </Link>
            <span className="text-foreground/40">·</span>
            <span className="text-foreground/50">Hecho con Next.js</span>
          </div>
        </div>
        <p className="mt-6 border-t border-foreground/10 pt-6 text-center text-xs text-foreground/45">
          © {new Date().getFullYear()} Mr. Paps. Todos los precios incluyen 16% IVA.
        </p>
      </GlassCard>
    </footer>
  );
}
