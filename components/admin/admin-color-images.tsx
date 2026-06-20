"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageIcon, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  adminDeleteColorImage,
  adminGetColorImages,
  adminSetColorImage,
  adminUploadAsset,
} from "@/lib/api";
import { BRAND_COLORS } from "@/lib/garment-colors";
import { BotyButton, BotyInput, BotyLabel } from "@/components/boty/ui-patterns";
import { cn } from "@/lib/utils";

export type ColorImageEntry = { color: string; imageUrl: string };

type AdminColorImagesProps = {
  productId: string;
  disabled?: boolean;
  onError: (msg: string | null) => void;
  onColorsChanged?: (colors: ColorImageEntry[]) => void;
};

type AddFormState = { name: string; file: File | null; preview: string | null };

/**
 * Grid visual de colores del producto.
 * Cada color tiene su foto; las acciones son icónicas y no verbosas.
 */
export function AdminColorImages({
  productId,
  disabled,
  onError,
  onColorsChanged,
}: AdminColorImagesProps) {
  const [colors, setColors] = useState<ColorImageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyColor, setBusyColor] = useState<string | null>(null);

  // Formulario de agregar (null = cerrado)
  const [addForm, setAddForm] = useState<AddFormState | null>(null);
  const [addBusy, setAddBusy] = useState(false);

  // Ref para input file de cambiar foto de color existente
  const changeFileRef = useRef<HTMLInputElement>(null);
  const pendingChangeColor = useRef<string | null>(null);

  const onColorsChangedRef = useRef(onColorsChanged);
  useEffect(() => { onColorsChangedRef.current = onColorsChanged; }, [onColorsChanged]);

  const reload = useCallback(async () => {
    const res = await adminGetColorImages(productId);
    setColors(res.data);
    onColorsChangedRef.current?.(res.data);
  }, [productId]);

  useEffect(() => {
    setLoading(true);
    void reload().finally(() => setLoading(false));
  }, [reload]);

  // ─── Cambiar foto de un color existente ────────────────────────────────────

  function triggerChangePhoto(color: string) {
    pendingChangeColor.current = color;
    changeFileRef.current?.click();
  }

  async function handleChangeFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const color = pendingChangeColor.current;
    if (!file || !color) return;
    e.target.value = "";
    setBusyColor(color);
    onError(null);
    try {
      const uploaded = await adminUploadAsset(file, { kind: "thumbnails", productId });
      await adminSetColorImage(productId, color, uploaded.data.url);
      await reload();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error al subir la imagen");
    } finally {
      setBusyColor(null);
    }
  }

  // ─── Quitar color ───────────────────────────────────────────────────────────

  async function handleDelete(color: string) {
    if (!window.confirm(`¿Quitar el color "${color}"?`)) return;
    setBusyColor(color);
    onError(null);
    try {
      await adminDeleteColorImage(productId, color);
      await reload();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error al eliminar el color");
    } finally {
      setBusyColor(null);
    }
  }

  // ─── Agregar nuevo color ────────────────────────────────────────────────────

  function openAddForm() {
    setAddForm({ name: "", file: null, preview: null });
    onError(null);
  }

  function closeAddForm() {
    setAddForm(null);
    onError(null);
  }

  function pickAddFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAddForm((prev) => prev
      ? { ...prev, file, preview: URL.createObjectURL(file) }
      : null,
    );
  }

  async function handleAddColor() {
    if (!addForm) return;
    const colorName = addForm.name.trim();
    if (!colorName) { onError("Indica un nombre de color."); return; }
    if (!addForm.file) { onError("Sube una foto para este color."); return; }
    if (colors.some((c) => c.color.toLowerCase() === colorName.toLowerCase())) {
      onError(`El color "${colorName}" ya está agregado.`); return;
    }
    setAddBusy(true);
    onError(null);
    try {
      const uploaded = await adminUploadAsset(addForm.file, { kind: "thumbnails", productId });
      await adminSetColorImage(productId, colorName, uploaded.data.url);
      await reload();
      closeAddForm();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error al agregar el color");
    } finally {
      setAddBusy(false);
    }
  }

  const availableBrandColors = BRAND_COLORS.filter(
    (bc) => !colors.some((c) => c.color.toLowerCase() === bc.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="aspect-square rounded-2xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Input oculto para cambiar foto */}
      <input
        ref={changeFileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => void handleChangeFile(e)}
      />

      {/* Grid de colores */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {colors.map((entry) => {
          const isBusy = busyColor === entry.color || !!disabled;
          return (
            <div key={entry.color} className="group relative">
              {/* Swatch con foto */}
              <div className="aspect-square rounded-2xl overflow-hidden border border-border/50 bg-muted/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.imageUrl}
                  alt={entry.color}
                  className="w-full h-full object-cover"
                />
                {/* Overlay en hover con acciones */}
                <div className={cn(
                  "absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2",
                  isBusy && "opacity-100",
                )}>
                  {isBusy ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => triggerChangePhoto(entry.color)}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                        title="Cambiar foto"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(entry.color)}
                        className="p-2 rounded-full bg-white/20 hover:bg-red-500/80 text-white transition-colors"
                        title="Quitar color"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {/* Nombre del color */}
              <p className="mt-1.5 text-xs text-center text-muted-foreground font-medium truncate px-0.5">
                {entry.color}
              </p>
            </div>
          );
        })}

        {/* Botón "Agregar color" como tarjeta */}
        {!addForm && !disabled && (
          <button
            type="button"
            onClick={openAddForm}
            className="group aspect-square rounded-2xl border-2 border-dashed border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-1.5"
          >
            <Plus className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary/70 transition-colors" />
            <span className="text-xs text-muted-foreground/50 group-hover:text-primary/70 transition-colors">Agregar</span>
          </button>
        )}
      </div>

      {/* Formulario inline para agregar color */}
      {addForm && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Nuevo color</p>
            <button
              type="button"
              onClick={closeAddForm}
              disabled={addBusy}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Selector rápido de colores predefinidos */}
            {availableBrandColors.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {availableBrandColors.map((bc) => (
                  <button
                    key={bc}
                    type="button"
                    onClick={() => setAddForm((prev) => prev ? { ...prev, name: bc } : null)}
                    disabled={addBusy}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full border transition-colors",
                      addForm.name === bc
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border/60 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                    )}
                  >
                    {bc}
                  </button>
                ))}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <BotyLabel>Nombre del color</BotyLabel>
                <BotyInput
                  placeholder="Ej. Verde Bosque…"
                  value={addForm.name}
                  onChange={(e) => setAddForm((prev) => prev ? { ...prev, name: e.target.value } : null)}
                  disabled={addBusy}
                />
              </div>

              <div>
                <BotyLabel>Foto del color</BotyLabel>
                <label className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full h-[62px] rounded-xl border-2 border-dashed cursor-pointer transition-colors",
                  addForm.preview
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/50 hover:border-primary/30 hover:bg-muted/20",
                  addBusy && "opacity-50 pointer-events-none",
                )}>
                  {addForm.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={addForm.preview} alt="preview" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
                      <span className="text-xs text-muted-foreground/60">PNG / JPG</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={pickAddFile}
                    disabled={addBusy}
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <BotyButton type="button" variant="ghost" size="sm" disabled={addBusy} onClick={closeAddForm}>
                Cancelar
              </BotyButton>
              <BotyButton
                type="button"
                variant="primary"
                size="sm"
                disabled={addBusy || !addForm.name.trim() || !addForm.file}
                onClick={() => void handleAddColor()}
              >
                {addBusy ? "Guardando…" : "Agregar color"}
              </BotyButton>
            </div>
          </div>
        </div>
      )}

      {colors.length === 0 && !addForm && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Agrega los colores para empezar.
        </p>
      )}
    </div>
  );
}
