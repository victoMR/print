import { AnimatedReveal } from "@/components/ui/AnimatedReveal";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { ParallaxSection } from "@/components/ui/ParallaxSection";

export function HomeCta() {
  return (
    <ParallaxSection className="px-4 py-16 md:px-6 md:py-20" speed={0.25}>
      <AnimatedReveal>
        <GlassCard strong className="mx-auto max-w-4xl px-8 py-12 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">
            ¿Listo para lanzar tu línea?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-foreground/70">
            Sube tu arte, elige variantes y nosotros imprimimos y enviamos desde
            Tijuana a todo el país.
          </p>
          <div className="mt-8 flex justify-center">
            <GlassButton href="/catalogo">Explorar productos</GlassButton>
          </div>
        </GlassCard>
      </AnimatedReveal>
    </ParallaxSection>
  );
}
