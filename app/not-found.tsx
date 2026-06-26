import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { GlassCard } from "@/components/ui/GlassCard";
import { noIndexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Página no encontrada",
  description: "La página que buscas no existe o fue movida.",
  robots: noIndexRobots,
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Header alwaysVisible />
      <div className="flex flex-1 items-center justify-center px-6 py-24 pt-32">
        <GlassCard strong className="max-w-lg w-full p-10 text-center boty-shadow">
          <p className="font-serif text-7xl md:text-8xl text-primary/20 mb-2 leading-none">
            404
          </p>
          <span className="mb-4 block text-sm tracking-[0.3em] uppercase text-primary">
            No encontrada
          </span>
          <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4 text-balance">
            Esta página no existe
          </h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            El enlace puede estar roto o la página fue eliminada. Prueba volver al inicio o
            explorar la tienda.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto min-h-11 inline-flex items-center justify-center px-8 py-3 rounded-full bg-primary text-primary-foreground text-sm font-medium boty-transition hover:opacity-90"
            >
              Ir al inicio
            </Link>
            <Link
              href="/shop"
              className="w-full sm:w-auto min-h-11 inline-flex items-center justify-center px-8 py-3 rounded-full glass text-sm font-medium text-foreground boty-transition hover:bg-white/20"
            >
              Ver tienda
            </Link>
          </div>
        </GlassCard>
      </div>
      <Footer variant="compact" />
    </main>
  );
}
