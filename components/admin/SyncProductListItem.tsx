"use client";

import { GlassButton } from "@/components/ui/GlassButton";
import type { PrintfulSyncProduct } from "@/lib/api-types";

type Props = {
  product: PrintfulSyncProduct;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  busy: boolean;
};

export function SyncProductListItem({ product, onEdit, onDelete, busy }: Props) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl glass p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={product.thumbnail_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{product.name}</p>
        <p className="text-xs text-foreground/50">
          ID {product.id} · {product.variants} variantes · sync {product.synced}/{product.variants}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <GlassButton type="button" variant="ghost" disabled={busy} onClick={() => onEdit(product.id)}>
          Editar
        </GlassButton>
        <GlassButton
          type="button"
          variant="ghost"
          disabled={busy}
          className="text-red-400 hover:text-red-300"
          onClick={() => onDelete(product.id)}
        >
          Eliminar
        </GlassButton>
      </div>
    </li>
  );
}
