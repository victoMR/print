"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BackgroundVideo } from "@/components/ui/BackgroundVideo";
import { MEDIA } from "@/lib/media-urls";

export function Hero() {
  return (
    <section className="relative flex min-h-[100svh] min-h-screen items-center overflow-hidden bg-[#F0E4E6]">
      <div className="absolute inset-0 z-0" aria-hidden>
        <BackgroundVideo
          src={MEDIA.hero.src}
          srcHd={MEDIA.hero.srcHd}
          poster={MEDIA.hero.poster}
          pauseOnLeave={false}
          playInView
          preload="metadata"
        />
        <div className="pointer-events-none absolute inset-0 bg-[#F0E4E6]/15 sm:bg-[#F0E4E6]/10" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent sm:via-background/15" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/35 via-transparent to-transparent lg:from-background/30" />
      </div>

      <div className="relative z-10 w-full px-4 pb-20 pt-[calc(env(safe-area-inset-top,0px)+7rem)] sm:px-6 sm:pb-24 sm:pt-[calc(env(safe-area-inset-top,0px)+8rem)] md:px-8 lg:pt-[calc(env(safe-area-inset-top,0px)+9rem)]">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mx-auto w-full max-w-xl text-center lg:mx-0 lg:max-w-2xl lg:text-left">
            <span
              className="mb-4 block text-xs font-medium uppercase tracking-[0.2em] text-foreground/90 animate-blur-in opacity-0 sm:mb-6 sm:text-sm sm:tracking-[0.25em]"
              style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
            >
              Impresión bajo demanda
            </span>

            <h1 className="font-serif text-balance leading-[1.05] text-foreground">
              <span
                className="block text-4xl font-semibold animate-blur-in opacity-0 sm:text-5xl md:text-6xl lg:text-7xl"
                style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}
              >
                Diseña.
              </span>
              <span
                className="mt-1 block text-4xl font-semibold animate-blur-in opacity-0 sm:mt-2 sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl"
                style={{ animationDelay: "0.6s", animationFillMode: "forwards" }}
              >
                Imprime. Viste.
              </span>
            </h1>

            <p
              className="mx-auto mt-5 max-w-sm text-base leading-relaxed text-foreground/85 animate-blur-in opacity-0 sm:mt-6 sm:max-w-md sm:text-lg lg:mx-0"
              style={{ animationDelay: "0.8s", animationFillMode: "forwards" }}
            >
              Crea ropa única con tus diseños. Camisetas, sudaderas y más, impresos bajo
              demanda con envío a todo México.
            </p>

            <div
              className="mt-8 flex flex-col items-stretch gap-3 animate-blur-in opacity-0 sm:mt-10 sm:flex-row sm:items-center sm:justify-center sm:gap-4 lg:justify-start"
              style={{ animationDelay: "1s", animationFillMode: "forwards" }}
            >
              <Link
                href="/shop"
                className="group inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-full bg-primary px-8 py-3.5 text-sm font-medium tracking-wide text-primary-foreground boty-shadow boty-transition hover:bg-primary/90 sm:w-auto sm:py-4"
              >
                Ver colección
                <ArrowRight className="h-4 w-4 shrink-0 group-hover:translate-x-1 boty-transition" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-foreground/70 sm:flex"
        aria-hidden
      >
        <span className="text-[10px] font-bold uppercase tracking-widest sm:text-xs">Scroll</span>
        <div className="relative h-10 w-px overflow-hidden bg-foreground/20 sm:h-12">
          <div className="absolute left-0 top-0 h-1/2 w-full animate-pulse bg-foreground/50" />
        </div>
      </div>
    </section>
  );
}
