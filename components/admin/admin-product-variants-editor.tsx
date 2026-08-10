"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  adminCreateProductVariant,
  adminGetProduct,
  adminUpdateProductVariant,
} from "@/lib/api";
import type { AdminProductVariant } from "@/lib/api-types";
import type { ColorImageEntry } from "@/components/admin/admin-color-images";
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
  productColors: ColorImageEntry[];
  defaultGarmentColor?: string;
  busy: boolean;
  setBusy: (v: boolean) => void;
  onError: (msg: string | null) => void;
  onChanged?: () => void;
  /** Se llama cuando cambia el número de filas con ediciones sin guardar. */
  onDirtyCountChange?: (count: number) => void;
};

export type VariantsEditorHandle = {
  saveAllDirty: () => Promise<void>;
};

type RowDraft = {
  size: string;
  color: string;
  retailPriceMxn: string;
  /** Vacío = sin precio en USD todavía (no se cobra en USD para esta variante). */
  retailPriceUsd: string;
  stockQuantityMx: string;
  stockQuantityUs: string;
};

type ColorStock = { color: string; selected: boolean; stockMx: string; stockUs: string };

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

export const AdminProductVariantsEditor = forwardRef<VariantsEditorHandle, AdminProductVariantsEditorProps>(
  function AdminProductVariantsEditor(
    {
      productId,
      productSlug,
      productColors,
      defaultGarmentColor = "#FFFFFF",
      busy,
      setBusy,
      onError,
      onChanged,
      onDirtyCountChange,
    },
    ref,
  ) {
    const [variants, setVariants] = useState<AdminProductVariant[]>([]);
    const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
    const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    const [newSize, setNewSize] = useState<string>(GARMENT_SIZES[2]);
    const [newPrice, setNewPrice] = useState("");
    const [colorStocks, setColorStocks] = useState<ColorStock[]>([]);

    const onChangedRef = useRef(onChanged);
    useEffect(() => { onChangedRef.current = onChanged; }, [onChanged]);

    const onDirtyCountChangeRef = useRef(onDirtyCountChange);
    useEffect(() => { onDirtyCountChangeRef.current = onDirtyCountChange; }, [onDirtyCountChange]);

    // Notify parent whenever dirty count changes
    useEffect(() => {
      onDirtyCountChangeRef.current?.(dirtyIds.size);
    }, [dirtyIds]);

    useEffect(() => {
      setColorStocks((prev) => {
        const next: ColorStock[] = productColors.map((pc) => {
          const existing = prev.find((cs) => cs.color === pc.color);
          return existing ?? { color: pc.color, selected: false, stockMx: "0", stockUs: "0" };
        });
        return next;
      });
    }, [productColors]);

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
          retailPriceUsd: v.retailPriceUsd ?? "",
          stockQuantityMx: String(v.stockQuantityMx ?? 0),
          stockQuantityUs: String(v.stockQuantityUs ?? 0),
        };
      }
      setDrafts(next);
      setDirtyIds(new Set());
      onChangedRef.current?.();
    }, [productId, onError]);

    useEffect(() => {
      setLoading(true);
      void reload().finally(() => setLoading(false));
    }, [reload]);

    function patchDraft(id: string, patch: Partial<RowDraft>) {
      setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
      setDirtyIds((prev) => new Set([...prev, id]));
    }

    function patchColorStock(color: string, patch: Partial<ColorStock>) {
      setColorStocks((prev) =>
        prev.map((cs) => (cs.color === color ? { ...cs, ...patch } : cs)),
      );
    }

    // ── Guardar todas las filas modificadas ──────────────────────────────────────

    const saveAllDirty = useCallback(async () => {
      if (dirtyIds.size === 0) return;
      setBusy(true);
      onError(null);
      try {
        for (const id of dirtyIds) {
          const d = drafts[id];
          const v = variants.find((vv) => vv.id === id);
          if (!d || !v) continue;
          const price = Number.parseFloat(d.retailPriceMxn);
          if (!Number.isFinite(price) || price <= 0) {
            onError(`Precio inválido para ${v.color} / ${v.size}.`);
            return;
          }
          let priceUsd: number | null = null;
          if (d.retailPriceUsd.trim()) {
            priceUsd = Number.parseFloat(d.retailPriceUsd);
            if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
              onError(`Precio en USD inválido para ${v.color} / ${v.size}.`);
              return;
            }
          }
          const stockMx = Number.parseInt(d.stockQuantityMx, 10);
          const stockUs = Number.parseInt(d.stockQuantityUs, 10);
          if (!Number.isFinite(stockMx) || stockMx < 0 || !Number.isFinite(stockUs) || stockUs < 0) {
            onError(`Inventario inválido para ${v.color} / ${v.size}.`);
            return;
          }
          await adminUpdateProductVariant(id, {
            sizeLabel: d.size.trim(),
            colorLabel: d.color.trim(),
            retailPriceMxn: price,
            retailPriceUsd: priceUsd,
            stockQuantityMx: stockMx,
            stockQuantityUs: stockUs,
          });
        }
        await reload();
      } catch (err) {
        onError(err instanceof Error ? err.message : "No se pudieron guardar las variantes");
      } finally {
        setBusy(false);
      }
    }, [dirtyIds, drafts, variants, setBusy, onError, reload]);

    useImperativeHandle(ref, () => ({ saveAllDirty }), [saveAllDirty]);

    // ── Cambiar estado de variante ────────────────────────────────────────────────

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

    // ── Agregar talla con colores seleccionados ───────────────────────────────────

    async function handleAddSize(e: React.FormEvent) {
      e.preventDefault();
      const price = Number.parseFloat(newPrice);
      if (!Number.isFinite(price) || price <= 0) { onError("Indica un precio válido."); return; }

      const selected = colorStocks.filter((cs) => cs.selected);
      if (selected.length === 0) { onError("Selecciona al menos un color."); return; }

      for (const cs of selected) {
        const stockMx = Number.parseInt(cs.stockMx, 10);
        const stockUs = Number.parseInt(cs.stockUs, 10);
        if (!Number.isFinite(stockMx) || stockMx < 0 || !Number.isFinite(stockUs) || stockUs < 0) {
          onError(`Inventario inválido para "${cs.color}".`); return;
        }
      }

      setBusy(true);
      onError(null);
      try {
        for (const cs of selected) {
          const stockMx = Number.parseInt(cs.stockMx, 10);
          const stockUs = Number.parseInt(cs.stockUs, 10);
          const size = newSize.trim();
          const color = cs.color;
          const sku = `${productSlug}-${slugifyName(size)}-${slugifyName(color)}`.slice(0, 50);

          await adminCreateProductVariant(productId, {
            sku,
            sizeLabel: size,
            colorLabel: color,
            retailPriceMxn: price,
            garmentColorHex: defaultGarmentColor,
          });

          if (stockMx > 0 || stockUs > 0) {
            const res = await adminGetProduct(productId);
            const created = res.data.variants.find(
              (v: { size: string; color: string; id: string }) =>
                v.size === size && v.color === color,
            );
            if (created) {
              await adminUpdateProductVariant(created.id, { stockQuantityMx: stockMx, stockQuantityUs: stockUs });
            }
          }
        }

        setNewPrice("");
        setColorStocks((prev) => prev.map((cs) => ({ ...cs, selected: false, stockMx: "0", stockUs: "0" })));
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

    const variantsBySize = variants.reduce<Record<string, AdminProductVariant[]>>((acc, v) => {
      (acc[v.size] = acc[v.size] ?? []).push(v);
      return acc;
    }, {});

    return (
      <div className="space-y-5">
        {/* Info banner */}
        <BotySurface className="p-4 bg-primary/5 border-primary/20">
          <div className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
            <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p>
                <strong className="text-foreground">Las variantes no se eliminan</strong> cuando tienen
                pedidos — solo se desactivan. Los pedidos conservan talla, color y precio del momento de compra.
              </p>
              <p className="mt-1.5 text-xs">
                {activeCount} activa{activeCount !== 1 ? "s" : ""} en tienda · {variants.length} en total
                {" · "}Inventario separado por mercado —{" "}
                <span className="font-medium text-foreground">0 = agotado</span> en ese país
              </p>
            </div>
          </div>
        </BotySurface>

        {/* Tabla de variantes existentes */}
        {variants.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Sin variantes. Agrega tallas abajo.
          </p>
        ) : (
          <div className="space-y-3">
            {Object.entries(variantsBySize).map(([size, sizeVariants]) => (
              <BotySurface key={size} className="overflow-hidden p-0">
                <div className="px-4 py-2 bg-muted/40 border-b border-border/40">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Talla {size}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border/30">
                        <th className="px-4 py-2">Color</th>
                        <th className="px-4 py-2">Precio MXN</th>
                        <th className="px-4 py-2">Precio USD</th>
                        <th className="px-4 py-2 text-center">Stock MX</th>
                        <th className="px-4 py-2 text-center">Stock US</th>
                        <th className="px-4 py-2">Estado</th>
                        <th className="px-4 py-2 text-center">Pedidos</th>
                        <th className="px-4 py-2 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sizeVariants.map((v) => {
                        const d = drafts[v.id];
                        const isDirty = dirtyIds.has(v.id);
                        if (!d) return null;
                        return (
                          <tr
                            key={v.id}
                            className={cn(
                              "border-t border-border/30",
                              v.status !== "active" && "opacity-60 bg-muted/10",
                              isDirty && "bg-amber-500/5",
                            )}
                          >
                            <td className="px-4 py-2 font-medium">
                              <div className="flex items-center gap-1.5">
                                {isDirty && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Cambios sin guardar" />
                                )}
                                {v.color}
                              </div>
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
                              <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground text-xs">$</span>
                                <BotyInput
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  placeholder="—"
                                  value={d.retailPriceUsd}
                                  onChange={(e) => patchDraft(v.id, { retailPriceUsd: e.target.value })}
                                  className="w-24"
                                  disabled={busy}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <BotyInput
                                type="number"
                                min="0"
                                step="1"
                                value={d.stockQuantityMx}
                                onChange={(e) => patchDraft(v.id, { stockQuantityMx: e.target.value })}
                                className="w-20 text-center"
                                disabled={busy}
                              />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <BotyInput
                                type="number"
                                min="0"
                                step="1"
                                value={d.stockQuantityUs}
                                onChange={(e) => patchDraft(v.id, { stockQuantityUs: e.target.value })}
                                className="w-20 text-center"
                                disabled={busy}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <BotyBadge className={STATUS_BADGE[v.status]}>
                                {STATUS_LABEL[v.status]}
                              </BotyBadge>
                            </td>
                            <td className="px-4 py-2 text-center tabular-nums text-muted-foreground text-xs">
                              {v.orderItemCount > 0 ? (
                                <span>{v.orderItemCount}</span>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex justify-end">
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
              </BotySurface>
            ))}
          </div>
        )}

        {/* Formulario para agregar nueva talla */}
        <BotySurface className="p-5">
          <h4 className="font-medium flex items-center gap-2 mb-4">
            <Plus className="w-4 h-4 text-primary" />
            Agregar talla
          </h4>

          {productColors.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-500/10 rounded-xl px-4 py-3">
              Primero agrega los colores del producto en la pestaña{" "}
              <strong>Información</strong>.
            </p>
          ) : (
            <form onSubmit={(e) => void handleAddSize(e)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>

              <div>
                <BotyLabel>Colores disponibles para talla {newSize}</BotyLabel>
                <p className="text-xs text-muted-foreground mb-2">
                  Selecciona los colores e indica el inventario de cada uno por mercado (0 = agotado en ese país).
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {colorStocks.map((cs) => {
                    const colorEntry = productColors.find((pc) => pc.color === cs.color);
                    return (
                      <label
                        key={cs.color}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors select-none",
                          cs.selected
                            ? "border-primary/40 bg-primary/5"
                            : "border-border/50 hover:border-border",
                          busy && "pointer-events-none opacity-50",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={cs.selected}
                          onChange={(e) => patchColorStock(cs.color, { selected: e.target.checked })}
                          className="w-4 h-4 rounded accent-primary shrink-0"
                          disabled={busy}
                        />

                        {colorEntry && (
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-border/40 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={colorEntry.imageUrl} alt={cs.color} className="w-full h-full object-cover" />
                          </div>
                        )}

                        <span className="text-sm font-medium flex-1">{cs.color}</span>

                        {cs.selected && (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">MX:</span>
                              <BotyInput
                                type="number"
                                min="0"
                                step="1"
                                value={cs.stockMx}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  patchColorStock(cs.color, { stockMx: e.target.value });
                                }}
                                onClick={(e) => e.preventDefault()}
                                onFocus={(e) => e.stopPropagation()}
                                className="w-16 text-center text-sm"
                                disabled={busy}
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">US:</span>
                              <BotyInput
                                type="number"
                                min="0"
                                step="1"
                                value={cs.stockUs}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  patchColorStock(cs.color, { stockUs: e.target.value });
                                }}
                                onClick={(e) => e.preventDefault()}
                                onFocus={(e) => e.stopPropagation()}
                                className="w-16 text-center text-sm"
                                disabled={busy}
                              />
                            </div>
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              <BotyButton
                type="submit"
                variant="primary"
                size="sm"
                disabled={busy || !colorStocks.some((cs) => cs.selected)}
              >
                Agregar {colorStocks.filter((cs) => cs.selected).length > 0
                  ? `${newSize} en ${colorStocks.filter((cs) => cs.selected).length} color(es)`
                  : newSize}
              </BotyButton>
            </form>
          )}
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
  },
);
