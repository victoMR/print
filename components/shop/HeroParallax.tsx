"use client";

import { AnimatedReveal } from "@/components/ui/AnimatedReveal";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { ParallaxSection } from "@/components/ui/ParallaxSection";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export function HeroParallax() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.3]);

  return (
    <div ref={ref} className="relative min-h-[85vh] flex items-center px-4 md:px-6">
      <motion.div
        style={{ y: bgY, opacity }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden
      >
        <div className="h-[420px] w-[420px] rounded-full bg-gradient-to-br from-indigo-400/30 to-pink-400/30 blur-3xl" />
      </motion.div>

      <ParallaxSection className="mx-auto w-full max-w-6xl" speed={0.2}>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <AnimatedReveal>
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-indigo-500">
              Print on demand · México
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl">
              Diseña.{" "}
              <span className="bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">
                Imprime.
              </span>{" "}
              Recibe.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-foreground/70">
              Merch premium con fulfillment desde Tijuana. Precios en pesos,
              IVA incluido y envío nacional con seguimiento.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <GlassButton href="/catalogo">Ver catálogo</GlassButton>
              <GlassButton href="/catalogo" variant="ghost">
                Destacados
              </GlassButton>
            </div>
          </AnimatedReveal>

          <AnimatedReveal delay={0.15} direction="left">
            <GlassCard strong className="p-6 md:p-8">
              <ul className="space-y-4 text-sm text-foreground/80">
                <li className="flex gap-3">
                  <span className="text-indigo-500">✦</span>
                  Cotización de envío en tiempo real
                </li>
                <li className="flex gap-3">
                  <span className="text-pink-500">✦</span>
                  Producción 2–7 días + entrega 3–7 días
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-500">✦</span>
                  Facturación CFDI 4.0 disponible
                </li>
              </ul>
            </GlassCard>
          </AnimatedReveal>
        </div>
      </ParallaxSection>
    </div>
  );
}
