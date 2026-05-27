"use client";

import { GlassButton } from "@/components/ui/GlassButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { adminGetSyncProduct, adminUpdateSyncProduct } from "@/lib/api";
import type { StoreProductDetailData } from "@/lib/api-types";
import { useEffect, useState } from "react";

type Props = {
  syncProductId: number;
  onClose: () => void;
  onSaved: () => void;
};

export function SyncProductEditModal({ syncProductId, onClose, onSaved }: Props) {
  const [detail, setDetail] = useState<StoreProductDetailData | null>(null);
  const [name, setName] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [variantFields, setVariantFields] = useState<
    Record<number, { externalId: string; retailPrice: string }>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminGetSyncProduct(syncProductId);
        if (cancelled) return;
        const d = res.data;
        setDetail(d);
        setName(d.sync_product.name ?? "");
        setThumbnail(
          d.sync_product.thumbnail ?? d.sync_product.thumbnail_url ?? "",
        );
        const vf: Record<number, { externalId: string; retailPrice: string }> = {};
        for (const v of d.sync_variants) {
          vf[v.id] = { externalId: v.external_id, retailPrice: v.retail_price };
        }
        setVariantFields(vf);
      } catch {
        if (!cancelled) setError("No se pudo cargar el producto");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [syncProductId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;
    setBusy(true);
    setError(null);
    try {
      await adminUpdateSyncProduct(syncProductId, {
        name,
        thumbnail,
        variants: detail.sync_variants.map((v) => ({
          syncVariantId: v.id,
          externalId: variantFields[v.id]?.externalId,
          retailPrice: variantFields[v.id]?.retailPrice,
        })),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <GlassCard className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
        <button
          type="button"
          className="absolute right-4 top-4 text-sm text-foreground/60 hover:text-foreground"
          onClick={onClose}
        >
          Cerrar
        </button>
        <h2 className="text-lg font-semibold pr-8 mb-4">Editar Sync Product</h2>
        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
        {!detail && !error && <p className="text-sm text-foreground/60">Cargando…</p>}
        {detail && (
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Nombre</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded-xl glass px-3 py-2 bg-transparent outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Thumbnail URL</span>
              <input
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
                required
                className="rounded-xl glass px-3 py-2 bg-transparent outline-none"
              />
            </label>
            <p className="text-xs text-foreground/50">Variantes (precio en MXN como en creación)</p>
            {detail.sync_variants.map((v) => (
              <div key={v.id} className="rounded-lg border border-white/10 p-3 space-y-2">
                <p className="text-xs text-foreground/50">
                  Sync variant #{v.id} · catálogo variant {v.variant_id}
                </p>
                <input
                  value={variantFields[v.id]?.externalId ?? ""}
                  onChange={(e) =>
                    setVariantFields((prev) => ({
                      ...prev,
                      [v.id]: { ...prev[v.id], externalId: e.target.value, retailPrice: prev[v.id]?.retailPrice ?? "" },
                    }))
                  }
                  className="w-full rounded-lg glass px-2 py-1.5 text-sm bg-transparent"
                  placeholder="external_id"
                />
                <input
                  value={variantFields[v.id]?.retailPrice ?? ""}
                  onChange={(e) =>
                    setVariantFields((prev) => ({
                      ...prev,
                      [v.id]: { ...prev[v.id], retailPrice: e.target.value, externalId: prev[v.id]?.externalId ?? "" },
                    }))
                  }
                  className="w-full rounded-lg glass px-2 py-1.5 text-sm bg-transparent"
                  placeholder="599.00"
                />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <GlassButton type="submit" variant="primary" className={busy ? "opacity-60" : ""}>
                {busy ? "Guardando…" : "Guardar en Printful"}
              </GlassButton>
              <GlassButton type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </GlassButton>
            </div>
          </form>
        )}
      </GlassCard>
    </div>
  );
}
