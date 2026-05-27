import { AnimatedReveal } from "@/components/ui/AnimatedReveal";

type CatalogHeaderProps = {
  title?: string;
  subtitle?: string;
};

export function CatalogHeader({
  title = "Catálogo",
  subtitle = "Playeras, sudaderas, accesorios y más. Todos los precios en MXN con IVA.",
}: CatalogHeaderProps) {
  return (
    <AnimatedReveal>
      <header className="mb-10 text-center md:mb-14">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-foreground/65">{subtitle}</p>
      </header>
    </AnimatedReveal>
  );
}
