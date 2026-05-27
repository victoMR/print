import { GlassCard } from "@/components/ui/GlassCard";
import type { CatalogProductSummary } from "@/lib/api-types";
import { cn } from "@/lib/utils";

type EmptyCatalogProps = {
  title?: string;
  message?: string;
  className?: string;
};

export function EmptyCatalog({
  title = "Catálogo vacío",
  message = "Aún no hay productos publicados. Configura la API o crea productos desde el panel admin.",
  className,
}: EmptyCatalogProps) {
  return (
    <GlassCard className={cn("px-8 py-16 text-center", className)}>
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-2 text-sm text-foreground/60 max-w-md mx-auto">{message}</p>
    </GlassCard>
  );
}

export function hasCatalogProducts(
  response: { data: CatalogProductSummary[] } | null,
): response is { data: CatalogProductSummary[] } {
  return Boolean(response && response.data.length > 0);
}
