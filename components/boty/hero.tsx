"use client";

import Link from "next/link";
import Image from "next/image";

export function Hero() {
  return (
    <section className="relative flex min-h-[100svh] min-h-screen items-center overflow-hidden bg-[#2A2726]">
      {/* Background photo */}
      <div className="absolute inset-0 z-0" aria-hidden>
        <Image
          src="/images/hero-photo.png"
          alt="Mr. Paps — Lujo Silencioso"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
          quality={90}
        />
        {/* Overlays for text legibility */}
        <div className="pointer-events-none absolute inset-0 bg-[#2A2726]/30" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#2A2726]/60 via-[#2A2726]/20 to-[#2A2726]/10" />
      </div>

      {/* Text content — vertically centered, left-aligned */}
      <div className="relative z-10 w-full px-8 sm:px-12 lg:px-16 xl:px-24 pt-[80px]">
        <div className="max-w-3xl">
          <h1
            className="font-serif text-[#f8f9fa] uppercase leading-tight animate-blur-in opacity-0"
            style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
          >
            <span className="block text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl tracking-[0.08em] mb-2">
              LUJO SILENCIOSO.
            </span>
            <span className="block text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl tracking-[0.08em] whitespace-nowrap">
              PRESENCIA QUE PERMANECE.
            </span>
          </h1>

          <div
            className="mt-10 animate-blur-in opacity-0"
            style={{ animationDelay: "0.7s", animationFillMode: "forwards" }}
          >
            <Link
              href="/shop"
              className="inline-block bg-[#5C1A24] text-[#f8f9fa] px-10 py-4 text-[11px] tracking-[0.25em] uppercase font-sans hover:bg-[#4A1520] boty-transition"
            >
              DESCUBRIR COLECCIÓN
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
