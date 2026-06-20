"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageIcon, Trash2, Upload, Plus } from "lucide-react";
import {
  adminDeleteColorImage,
  adminGetColorImages,
  adminSetColorImage,
  adminUploadAsset,
} from "@/lib/api";
import { BRAND_COLORS } from "@/lib/garment-colors";
import { BotyButton, BotyInput, BotyLabel, BotySurface } from "@/components/boty/ui-patterns";

export type ColorImageEntry = { color: string; imageUrl: string };

type AdminColorImagesProps = {
  productId: string;
  disabled?: boolean;
  onError: (msg: string | null) => void;
  /** Se llama cuando los colores cambian (para que el editor de variantes se actualice). */
  onColorsChanged?: (colors: ColorImageEntry[]) => void;
};

/**
 * Gestiona los colores del producto con su foto asociada.
 * Los colores y sus fotos reemplazan la galería genérica del producto:
 * al seleccionar un color en tienda se muestra su foto.
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

  // Form para agregar nuevo color
  const [showAddForm, setShowAddForm] = useState(false);
  const [newColorName, setNewColorName] = useState("");
  const [newColorFile, setNewColorFile] = useState<File | null>(null);
  const [newColorPreview, setNewColorPreview] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);

  // Para subir/cambiar foto de un color existente
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

  // ── Cambiar foto de color existente ──────────────────────────────────────────

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

  // ── Quitar color ──────────────────────────────────────────────────────────────

  async function handleDelete(color: string) {
    if (!window.confirm(`¿Quitar el color "${color}"? Las variantes que lo usen quedarán inactivas si ya no tiene foto.`)) return;
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

  // ── Agregar nuevo color ───────────────────────────────────────────────────────

  function pickNewFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewColorFile(file);
    setNewColorPreview(URL.createObjectURL(file));
  }

  async function handleAddColor(e: React.FormEvent) {
    e.preventDefault();
    const colorName = newColorName.trim();
    if (!colorName) { onError("Indica un nombre de color."); return; }
    if (!newColorFile) { onError("Sube una foto para este color."); return; }
    if (colors.some((c) => c.color.toLowerCase() === colorName.toLowerCase())) {
      onError(`El color "${colorName}" ya está agregado.`); return;
    }
    setAddBusy(true);
    onError(null);
    try {
      const uploaded = await adminUploadAsset(newColorFile, { kind: "thumbnails", productId });
      await adminSetColorImage(productId, colorName, uploaded.data.url);
      await reload();
      setNewColorName("");
      setNewColorFile(null);
      setNewColorPreview(null);
      setShowAddForm(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error al agregar el color");
    } finally {
      setAddBusy(false);
    }
  }

  // Colores predefinidos que aún no están en el producto
  const availableBrandColors = BRAND_COLORS.filter(
    (bc) => !colors.some((c) => c.color.toLowerCase() === bc.toLowerCase()),
  );

  if (loading) {
    return <p className="text-sm text-muted-foreground py-4">Cargando colores…</p>;
  }

  return (
    <div className="space-y-3">
      {/* Input oculto para cambiar foto de un color ya existente */}
      <input
        ref={changeFileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => void handleChangeFile(e)}
      />

      <p className="text-xs text-muted-foreground leading-relaxed">
        Define los colores del producto y sube una foto para cada uno. Las fotos de color
        son las imágenes que se muestran en tienda al seleccionar un color.
      </p>

      {/* Lista de colores actuales */}
      {colors.length === 0 && !showAddForm && (
        <p className="text-sm text-center text-muted-foreground py-4">
          Sin colores. Agrega el primer color abajo.
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {colors.map((entry) => {
          const isBusy = busyColor === entry.color || disabled;
          return (
            <BotySurface key={entry.color} className="p-3 flex items-center gap-3">
              {/* Miniatura */}
              <div className="w-14 h-14 rounded-xl overflow-hidden border border-border/60 shrink-0 bg-muted/30 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={entry.imageUrl} alt={entry.color} className="w-full h-full object-cover" />
              </div>

              {/* Nombre */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entry.color}</p>
              </div>

              {/* Acciones */}
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={!!isBusy}
                  onClick={() => triggerChangePhoto(entry.color)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40"
                  title="Cambiar foto"
                >
                  <Upload className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={!!isBusy}
                  onClick={() => void handleDelete(entry.color)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                  title="Quitar color"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </BotySurface>
          );
        })}
      </div>

      {/* Formulario agregar color */}
      {showAddForm ? (
        <BotySurface className="p-4 border-primary/30 bg-primary/5">
          <form onSubmit={(e) => void handleAddColor(e)} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <BotyLabel>Nombre del color *</BotyLabel>
                {/* Selector rápido de colores predefinidos */}
                {availableBrandColors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {availableBrandColors.map((bc) => (
                      <button
                        key={bc}
                        type="button"
                        onClick={() => setNewColorName(bc)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          newColorName === bc
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        }`}
                      >
                        {bc}
                      </button>
                    ))}
                  </div>
                )}
                <BotyInput
                  placeholder="Ej. Verde, Borgoña, Azul Rey…"
                  value={newColorName}
                  onChange={(e) => setNewColorName(e.target.value)}
                  disabled={addBusy}
                  required
                />
              </div>

              <div>
                <BotyLabel>Foto del color *</BotyLabel>
                <label className={`flex flex-col items-center justify-center gap-1.5 w-full h-[72px] rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                  newColorPreview ? "border-primary/40 bg-primary/5" : "border-border/60 hover:border-primary/40 hover:bg-muted/20"
                } ${addBusy ? "opacity-50 pointer-events-none" : ""}`}>
                  {newColorPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={newColorPreview} alt="preview" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <>
                      <ImageIcon className="w-5 h-5 text-muted-foreground/60" />
                      <span className="text-xs text-muted-foreground">PNG, JPG o WebP</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={pickNewFile}
                    disabled={addBusy}
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <BotyButton
                type="button"
                variant="ghost"
                size="sm"
                disabled={addBusy}
                onClick={() => { setShowAddForm(false); setNewColorName(""); setNewColorFile(null); setNewColorPreview(null); onError(null); }}
              >
                Cancelar
              </BotyButton>
              <BotyButton
                type="submit"
                variant="primary"
                size="sm"
                disabled={addBusy || !newColorName.trim() || !newColorFile}
              >
                {addBusy ? "Guardando…" : "Agregar color"}
              </BotyButton>
            </div>
          </form>
        </BotySurface>
      ) : (
        <BotyButton
          type="button"
          variant="secondary"
          size="sm"
          disabled={!!disabled}
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar color
        </BotyButton>
      )}
    </div>
  );
}
