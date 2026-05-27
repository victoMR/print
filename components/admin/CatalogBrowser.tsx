"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import type { PrintfulCatalogProduct } from "@/lib/api-types";

type CatalogBrowserProps = {
  products: PrintfulCatalogProduct[];
  loading: boolean;
  onSelect: (product: PrintfulCatalogProduct) => void;
  selectedId: number | null;
};

export function CatalogBrowser({
  products,
  loading,
  onSelect,
  selectedId,
}: CatalogBrowserProps) {
  return (
    <GlassCard className="p-6">
      <h2 className="text-lg font-semibold mb-4">Catálogo Printful</h2>
      {loading && <p className="text-sm text-foreground/60">Cargando catálogo…</p>}
      <div className="max-h-64 overflow-y-auto flex flex-col gap-2">
        {products.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p)}
            className={`text-left rounded-xl p-3 transition-colors ${
              selectedId === p.id ? "bg-indigo-500/20 ring-1 ring-indigo-500/40" : "glass hover:bg-white/20"
            }`}
          >
            <p className="font-medium text-sm">{p.title}</p>
            <p className="text-xs text-foreground/50">
              #{p.id} · {p.brand} · {p.variant_count} variantes
            </p>
          </button>
        ))}
      </div>
    </GlassCard>
  );
}
