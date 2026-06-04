"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminCreateProductVariant,
  adminGetProduct,
  adminUpdateProductVariant,
} from "@/lib/api";
import type { AdminProductVariant } from "@/lib/api-types";
import { GARMENT_SIZES } from "@/lib/garment-sizes";
import { slugifyName } from "@/lib/composer-export";
import { cn, formatMxn } from "@/lib/utils";
import {
  BotyBadge,
  BotyButton,
  BotyInput,
  BotyLabel,
  BotySurface,
} from "@/components/boty/ui-patterns";
import { AdminSelect } from "@/components/admin/admin-select";
import { AlertCircle, Plus } from "lucide-react";

type AdminProductVariantsEditorProps = {
  productId: string;
  productSlug: string;
  defaultGarmentColor?: string;
  busy: boolean;
  setBusy: (v: boolean) => void;
  onError: (msg: string | null) => void;
  onChanged?: () => void;
};

type RowDraft = {
  size: string;
  color: string;
  retailPriceMxn: string;
};

const STATUS_LABEL: Record<AdminProductVariant["status"], string> = {
  active: "Activa",
  inactive: "Inactiva",
  archived: "Archivada",
};

const STATUS_BADGE: Record<AdminProductVariant["status"], string> = {
  active: "bg-emerald-500/15 text-emerald-800",
  inactive: "bg-amber-500/15 text-amber-900",
  archived: "bg-muted text-muted-foreground",
};

export function AdminProductVariantsEditor({
  productId,
  productSlug,
  defaultGarmentColor = "#FFFFFF",
  busy,
  setBusy,
  onError,
  onChanged,
}: AdminProductVariantsEditorProps) {
  const [variants, setVariants] = useState<AdminProductVariant[]>([]);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [loading, setLoading] = useState(true);

  // Add-one form
  const [newSize, setNewSize] = useState<string>(GARMENT_SIZES[2]); // M
  const [newColor, setNewColor] = useState("Estándar");
  const [newPrice, setNewPrice] = useState("");

  // Ref so onChanged never causes reload to be recreated
  const onChangedRef = useRef(onChanged);
  useEffect(() => { onChangedRef.current = onChanged; }, [onChanged]);

  const reload = useCallback(async () => {
    onError(null);
    const res = await adminGetProduct(productId);
    setVariants(res.data.variants);
    const next: Record<string, RowDraft> = {};
    for (const v of res.data.variants) {
      next[v.id] = {
        size: v.size,
        color: v.color,
        retailPriceMxn: v.retailPriceMxn,
      };
    }
    setDrafts(next);
    onChangedRef.current?.();
  }, [productId, onError]);

  useEffect(() => {
    setLoading(true);
    void reload().finally(() => setLoading(false));
  }, [reload]);

  function patchDraft(id: string, patch: Partial<RowDraft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function saveRow(variant: AdminProductVariant) {
    const d = drafts[variant.id];
    if (!d) return;
    const price = Number.parseFloat(d.retailPriceMxn);
    if (!Number.isFinite(price) || price <= 0) {
      onError("Precio inválido en la fila.");
      return;
    }
    setBusy(true);
    onError(null);
    try {
      await adminUpdateProductVariant(variant.id, {
        sizeLabel: d.size.trim(),
        colorLabel: d.color.trim(),
        retailPriceMxn: price,
        // SKU se genera automáticamente; no se edita desde UI
      });
      await reload();
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo guardar la variante");
    } finally {
      setBusy(false);
    }
  }

  async function setVariantStatus(variant: AdminProductVariant, status: AdminProductVariant["status"]) {
    if (status !== "active" && variant.orderItemCount > 0) {
      const ok = window.confirm(
        `Esta variante aparece en ${variant.orderItemCount} pedido(s). ¿Desactivarla para nuevas ventas? Los pedidos existentes no se afectan.`,
      );
      if (!ok) return;
    }
    setBusy(true);
    onError(null);
    try {
      await adminUpdateProductVariant(variant.id, { status });
      await reload();
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo cambiar el estado");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddOne(e: React.FormEvent) {
    e.preventDefault();
    const price = Number.parseFloat(newPrice);
    if (!Number.isFinite(price) || price <= 0) {
      onError("Indica un precio válido.");
      return;
    }
    const size = newSize.trim();
    const color = newColor.trim() || "Estándar";
    setBusy(true);
    onError(null);
    try {
      await adminCreateProductVariant(productId, {
        sku: `${productSlug}-${slugifyName(size)}-${slugifyName(color)}`.slice(0, 50),
        sizeLabel: size,
        colorLabel: color,
        retailPriceMxn: price,
        garmentColorHex: defaultGarmentColor,
      });
      setNewPrice("");
      await reload();
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo agregar la variante");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground py-4">Cargando variantes…</p>;
  }

  const activeCount = variants.filter((v) => v.status === "active").length;

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <BotySurface className="p-4 bg-primary/5 border-primary/20">
        <div className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
          <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p>
              <strong className="text-foreground">Las variantes no se eliminan</strong> cuando tienen
              pedidos — solo se desactivan. Los pedidos conservan talla y precio del momento de la compra.
            </p>
            <p className="mt-1.5 text-xs">
              {activeCount} activa{activeCount !== 1 ? "s" : ""} en tienda · {variants.length} en total
            </p>
          </div>
        </div>
      </BotySurface>

      {/* Variants table */}
      {variants.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Sin variantes. Agrega tallas y precios abajo.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5">Talla</th>
                <th className="px-4 py-2.5">Color</th>
                <th className="px-4 py-2.5">Precio MXN</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5 text-center">Pedidos</th>
                <th className="px-4 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => {
                const d = drafts[v.id];
                if (!d) return null;
                return (
                  <tr
                    key={v.id}
                    className={cn(
                      "border-t border-border/40",
                      v.status !== "active" && "opacity-60 bg-muted/10",
                    )}
                  >
                    <td className="px-4 py-2">
                      <BotyInput
                        value={d.size}
                        onChange={(e) => patchDraft(v.id, { size: e.target.value })}
                        className="w-16 text-center font-medium"
                        disabled={busy}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <BotyInput
                        value={d.color}
                        onChange={(e) => patchDraft(v.id, { color: e.target.value })}
                        className="min-w-[6rem]"
                        disabled={busy}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground text-xs">$</span>
                        <BotyInput
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={d.retailPriceMxn}
                          onChange={(e) => patchDraft(v.id, { retailPriceMxn: e.target.value })}
                          className="w-24"
                          disabled={busy}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <BotyBadge className={STATUS_BADGE[v.status]}>{STATUS_LABEL[v.status]}</BotyBadge>
                    </td>
                    <td className="px-4 py-2 text-center tabular-nums text-muted-foreground text-xs">
                      {v.orderItemCount > 0 ? (
                        <span title="Pedidos que incluyen esta variante">{v.orderItemCount}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1.5">
                        <BotyButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={busy}
                          onClick={() => void saveRow(v)}
                        >
                          Guardar
                        </BotyButton>
                        {v.status === "active" ? (
                          <BotyButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => void setVariantStatus(v, "inactive")}
                          >
                            Desactivar
                          </BotyButton>
                        ) : (
                          <BotyButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => void setVariantStatus(v, "active")}
                          >
                            Activar
                          </BotyButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add variant form */}
      <BotySurface className="p-5">
        <h4 className="font-medium flex items-center gap-2 mb-4">
          <Plus className="w-4 h-4 text-primary" />
          Agregar talla
        </h4>
        <form onSubmit={(e) => void handleAddOne(e)} className="grid gap-4 sm:grid-cols-3">
          <div>
            <BotyLabel>Talla</BotyLabel>
            <AdminSelect
              value={newSize}
              onValueChange={setNewSize}
              disabled={busy}
              options={GARMENT_SIZES.map((s) => ({ value: s, label: s }))}
            />
          </div>
          <div>
            <BotyLabel>Color</BotyLabel>
            <BotyInput
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              placeholder="Ej. Negro, Blanco…"
              disabled={busy}
            />
          </div>
          <div>
            <BotyLabel>Precio de venta (MXN)</BotyLabel>
            <BotyInput
              type="number"
              min="0.01"
              step="0.01"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="499.00"
              required
              disabled={busy}
            />
          </div>
          <div className="sm:col-span-3">
            <BotyButton type="submit" variant="primary" size="sm" disabled={busy}>
              Agregar talla {newSize}
            </BotyButton>
          </div>
        </form>
      </BotySurface>

      {activeCount > 0 && (
        <p className="text-xs text-muted-foreground">
          Precio mínimo en tienda:{" "}
          <strong>
            {formatMxn(
              Math.min(
                ...variants
                  .filter((v) => v.status === "active")
                  .map((v) => Number.parseFloat(v.retailPriceMxn)),
              ).toFixed(2),
            )}
          </strong>
        </p>
      )}
    </div>
  );
}
