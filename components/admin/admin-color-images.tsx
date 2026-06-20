"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageIcon, Trash2, Upload } from "lucide-react";
import {
  adminDeleteColorImage,
  adminGetColorImages,
  adminSetColorImage,
  adminUploadAsset,
} from "@/lib/api";
import type { AdminProductVariant } from "@/lib/api-types";
import { BotyButton, BotySurface } from "@/components/boty/ui-patterns";

type ColorImageEntry = { color: string; imageUrl: string };

type AdminColorImagesProps = {
  productId: string;
  variants: AdminProductVariant[];
  disabled?: boolean;
  onError: (msg: string | null) => void;
};

/**
 * Muestra los colores únicos del producto (derivados de las variantes activas)
 * y permite asignar/quitar una foto a cada uno.
 */
export function AdminColorImages({
  productId,
  variants,
  disabled,
  onError,
}: AdminColorImagesProps) {
  const [colorImages, setColorImages] = useState<ColorImageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyColor, setBusyColor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingColorRef = useRef<string | null>(null);

  const activeColors = [
    ...new Set(
      variants.filter((v) => v.status === "active").map((v) => v.color).filter(Boolean),
    ),
  ];

  const reload = useCallback(async () => {
    const res = await adminGetColorImages(productId);
    setColorImages(res.data);
  }, [productId]);

  useEffect(() => {
    setLoading(true);
    void reload().finally(() => setLoading(false));
  }, [reload]);

  function getImageUrl(color: string) {
    return colorImages.find((ci) => ci.color === color)?.imageUrl ?? null;
  }

  function triggerUpload(color: string) {
    pendingColorRef.current = color;
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const color = pendingColorRef.current;
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

  async function handleDelete(color: string) {
    setBusyColor(color);
    onError(null);
    try {
      await adminDeleteColorImage(productId, color);
      await reload();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error al eliminar la imagen");
    } finally {
      setBusyColor(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground py-4">Cargando fotos por color…</p>;
  }

  if (activeColors.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Agrega variantes activas primero para poder asignar fotos por color.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => void handleFileSelected(e)}
      />

      <p className="text-xs text-muted-foreground">
        Asigna una foto a cada color. Al seleccionar un color en tienda se mostrará su imagen.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {activeColors.map((color) => {
          const imageUrl = getImageUrl(color);
          const isBusy = busyColor === color;

          return (
            <BotySurface key={color} className="p-3 flex items-center gap-3">
              {/* Miniatura */}
              <div className="w-16 h-16 rounded-xl overflow-hidden border border-border/60 shrink-0 bg-muted/30 flex items-center justify-center">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt={color} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                )}
              </div>

              {/* Info + acciones */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{color}</p>
                <p className="text-xs text-muted-foreground">
                  {imageUrl ? "Foto asignada" : "Sin foto"}
                </p>
              </div>

              <div className="flex gap-1.5 shrink-0">
                <BotyButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={disabled || isBusy}
                  onClick={() => triggerUpload(color)}
                  title="Subir foto"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isBusy ? "…" : imageUrl ? "Cambiar" : "Subir"}
                </BotyButton>

                {imageUrl && (
                  <BotyButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled || isBusy}
                    onClick={() => void handleDelete(color)}
                    title="Quitar foto"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </BotyButton>
                )}
              </div>
            </BotySurface>
          );
        })}
      </div>
    </div>
  );
}
