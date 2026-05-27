"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import type { PrintfulSyncProduct } from "@/lib/api-types";
import { SyncProductListItem } from "@/components/admin/SyncProductListItem";

type SyncProductListProps = {
  products: PrintfulSyncProduct[];
  loading: boolean;
  busy: boolean;
  onEdit: (syncProductId: number) => void;
  onDelete: (syncProductId: number) => void;
};

export function SyncProductList({
  products,
  loading,
  busy,
  onEdit,
  onDelete,
}: SyncProductListProps) {
  return (
    <GlassCard className="p-6">
      <h2 className="text-lg font-semibold mb-4">Productos sync (CRUD)</h2>
      <p className="text-xs text-foreground/50 mb-3">
        Listar, editar y eliminar en Printful + Supabase. Crear abajo.
      </p>
      {loading && <p className="text-sm text-foreground/60">Cargando…</p>}
      {!loading && products.length === 0 && (
        <p className="text-sm text-foreground/60">No hay productos sync aún.</p>
      )}
      <ul className="flex flex-col gap-3 list-none p-0 m-0">
        {products.map((p) => (
          <SyncProductListItem
            key={p.id}
            product={p}
            busy={busy}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </GlassCard>
  );
}
