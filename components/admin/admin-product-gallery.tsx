"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const MAX_PRODUCT_GALLERY = 12;

type AdminProductGalleryProps = {
  urls: string[];
  pendingPreviews?: string[];
  disabled?: boolean;
  onAddFiles: (files: File[]) => void;
  onRemove: (index: number) => void;
  onRemovePending?: (index: number) => void;
  onMove: (from: number, to: number) => void;
  onSetPrimary: (index: number) => void;
};

export function AdminProductGallery({
  urls,
  pendingPreviews = [],
  disabled,
  onAddFiles,
  onRemove,
  onRemovePending,
  onMove,
  onSetPrimary,
}: AdminProductGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const total = urls.length + pendingPreviews.length;
  const canAdd = total < MAX_PRODUCT_GALLERY;

  function handleFiles(list: FileList | null) {
    if (!list?.length || disabled) return;
    const remaining = MAX_PRODUCT_GALLERY - total;
    onAddFiles(Array.from(list).slice(0, remaining));
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          Fotos del producto
        </p>
        <span className="text-xs text-muted-foreground">
          {total}/{MAX_PRODUCT_GALLERY} · la primera es la portada
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {urls.map((url, index) => (
          <GalleryTile
            key={`saved-${url}-${index}`}
            src={url}
            index={index}
            total={urls.length}
            isPrimary={index === 0}
            disabled={disabled}
            onRemove={() => onRemove(index)}
            onMoveLeft={() => onMove(index, index - 1)}
            onMoveRight={() => onMove(index, index + 1)}
            onSetPrimary={() => onSetPrimary(index)}
          />
        ))}

        {pendingPreviews.map((src, index) => (
          <div
            key={`pending-${src}`}
            className="relative aspect-square rounded-xl overflow-hidden border border-dashed border-primary/40 bg-muted/20 group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
            <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white rounded px-1.5 py-0.5">
              Nueva
            </span>
            {!disabled && onRemovePending && (
              <button
                type="button"
                title="Quitar"
                onClick={() => onRemovePending(index)}
                className="absolute top-1 right-1 p-1 rounded bg-white/90 text-destructive opacity-0 group-hover:opacity-100 boty-transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}

        {canAdd && (
          <label
            className={cn(
              "relative aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer boty-transition",
              disabled
                ? "opacity-50 pointer-events-none border-border/50"
                : "border-border/70 hover:border-primary/60 bg-muted/20",
            )}
          >
            <ImagePlus className="w-5 h-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground text-center px-1">
              Agregar
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="sr-only"
              disabled={disabled}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        )}
      </div>
    </div>
  );
}

function GalleryTile({
  src,
  index,
  total,
  isPrimary,
  disabled,
  onRemove,
  onMoveLeft,
  onMoveRight,
  onSetPrimary,
}: {
  src: string;
  index: number;
  total: number;
  isPrimary: boolean;
  disabled?: boolean;
  onRemove: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onSetPrimary: () => void;
}) {
  return (
    <div className="relative aspect-square rounded-xl overflow-hidden border border-border/60 group bg-muted/30">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />

      {isPrimary && (
        <span className="absolute top-1 left-1 flex items-center gap-0.5 text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
          <Star className="w-2.5 h-2.5 fill-current" />
          Portada
        </span>
      )}

      {!disabled && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 boty-transition flex items-end justify-center gap-0.5 p-1 opacity-0 group-hover:opacity-100">
          {index > 0 && (
            <button
              type="button"
              title="Mover a la izquierda"
              onClick={onMoveLeft}
              className="p-1 rounded bg-white/90 text-foreground hover:bg-white"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          {!isPrimary && (
            <button
              type="button"
              title="Usar como portada"
              onClick={onSetPrimary}
              className="p-1 rounded bg-white/90 text-foreground hover:bg-white"
            >
              <Star className="w-3.5 h-3.5" />
            </button>
          )}
          {index < total - 1 && (
            <button
              type="button"
              title="Mover a la derecha"
              onClick={onMoveRight}
              className="p-1 rounded bg-white/90 text-foreground hover:bg-white"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            title="Eliminar"
            onClick={onRemove}
            className="p-1 rounded bg-white/90 text-destructive hover:bg-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Reordena un array moviendo un índice a otro. */
export function reorderGallery<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Mueve la foto en `index` al inicio (portada). */
export function setPrimaryGallery<T>(items: T[], index: number): T[] {
  if (index <= 0 || index >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.unshift(item);
  return next;
}
