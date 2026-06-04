"use client";

import { useEffect, useRef, useState } from "react";
import {
  adminCreateProduct,
  adminCreateProductVariant,
  adminUpdateProduct,
  adminUploadAsset,
} from "@/lib/api";
import type { AdminProductDetail } from "@/lib/api-types";
import { GARMENT_SIZES } from "@/lib/garment-sizes";
import { slugifyName } from "@/lib/composer-export";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type ProductCategory,
} from "@/lib/product-categories";
import { cn, formatMxn } from "@/lib/utils";
import {
  BotyButton,
  BotyInput,
  BotyLabel,
  BotyModal,
  BotySelect,
  BotySurface,
  BotyTabs,
  BotyTextarea,
} from "@/components/boty/ui-patterns";
import { AdminProductVariantsEditor } from "@/components/admin/admin-product-variants-editor";
import { ImagePlus } from "lucide-react";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

type VariantDraft = {
  size: string;
  color: string;
  price: string;
};

function VariantPill({
  v,
  onRemove,
}: {
  v: VariantDraft;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary rounded-full px-3 py-1.5 font-medium">
      {v.size} · {v.color} · {formatMxn(v.price || "0")}
      <button type="button" onClick={onRemove} className="hover:text-destructive ml-0.5">
        ×
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// CREATE MODAL — 2 steps
// ---------------------------------------------------------------------------

type CreateProductModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (productId: string, productSlug: string) => void;
};

type CreateStep = "info" | "variants";

export function CreateProductModal({ open, onClose, onCreated }: CreateProductModalProps) {
  const [step, setStep] = useState<CreateStep>("info");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ProductCategory>("camiseta");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Step 2 state – created product
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  // Step 2 – variant queue (one by one)
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [variantsBusy, setVariantsBusy] = useState(false);
  const [addSize, setAddSize] = useState<string>(GARMENT_SIZES[2]); // M
  const [addColor, setAddColor] = useState("Estándar");
  const [addPrice, setAddPrice] = useState("");

  // Reset on open/close
  useEffect(() => {
    if (!open) {
      setStep("info");
      setName("");
      setDescription("");
      setCategory("camiseta");
      setPhotoFile(null);
      setPhotoPreview(null);
      setCreatedId(null);
      setCreatedSlug(null);
      setVariants([]);
      setAddSize(GARMENT_SIZES[2]);
      setAddColor("Estándar");
      setAddPrice("");
      setError(null);
    }
  }, [open]);

  function pickPhoto(file: File) {
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    if (!photoFile) { setError("Sube una foto del producto."); return; }
    setBusy(true);
    setError(null);
    try {
      const slug = slugifyName(name);
      const res = await adminCreateProduct({
        name: name.trim(),
        slug,
        description: description.trim() || undefined,
        category,
      });
      const uploaded = await adminUploadAsset(photoFile, {
        kind: "thumbnails",
        productId: res.data.id,
      });
      await adminUpdateProduct(res.data.id, {
        thumbnailUrl: uploaded.data.url,
      });
      setCreatedId(res.data.id);
      setCreatedSlug(res.data.slug);
      setStep("variants");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el producto");
    } finally {
      setBusy(false);
    }
  }

  function handleAddToQueue(e: React.FormEvent) {
    e.preventDefault();
    const p = Number.parseFloat(addPrice);
    if (!Number.isFinite(p) || p <= 0) { setError("Indica un precio válido."); return; }
    const color = addColor.trim() || "Estándar";
    const key = `${addSize}|${color}`;
    if (variants.some((v) => `${v.size}|${v.color}` === key)) {
      setError(`Ya agregaste ${addSize} · ${color}.`);
      return;
    }
    setError(null);
    setVariants((prev) => [...prev, { size: addSize, color, price: p.toFixed(2) }]);
    setAddPrice("");
  }

  async function handleSaveVariants() {
    if (!createdId || !createdSlug) return;
    if (variants.length === 0) {
      onCreated(createdId, createdSlug);
      onClose();
      return;
    }
    setVariantsBusy(true);
    setError(null);
    try {
      for (const v of variants) {
        await adminCreateProductVariant(createdId, {
          sku: `${createdSlug}-${slugifyName(v.size)}-${slugifyName(v.color)}`.slice(0, 50),
          sizeLabel: v.size,
          colorLabel: v.color,
          retailPriceMxn: Number.parseFloat(v.price),
        });
      }
      onCreated(createdId, createdSlug);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar variantes");
    } finally {
      setVariantsBusy(false);
    }
  }

  const isBusy = busy || variantsBusy;

  return (
    <BotyModal
      open={open}
      onClose={onClose}
      size="lg"
      title={step === "info" ? "Nuevo producto" : `Variantes de "${name}"`}
      description={
        step === "info"
          ? "Foto, nombre y tipo de precio. Podrás editar variantes después."
          : "Agrega las tallas y colores que estarán disponibles en tienda."
      }
    >
      {/* STEP 1 — INFO */}
      {step === "info" && (
        <form onSubmit={(e) => void handleStep1(e)} className="space-y-5">
          {/* Photo upload */}
          <div>
            <BotyLabel>Foto del producto</BotyLabel>
            <label className={cn(
              "mt-1.5 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed cursor-pointer boty-transition overflow-hidden",
              photoPreview ? "border-transparent p-0 h-48" : "border-border/70 hover:border-primary/60 bg-muted/30 p-8",
            )}>
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <>
                  <ImagePlus className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground text-center">
                    Haz clic para subir PNG, JPG o WebP
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) pickPhoto(f); }}
                required
              />
            </label>
            {photoPreview && (
              <button
                type="button"
                className="mt-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
              >
                Cambiar foto
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <BotyLabel>Nombre del producto *</BotyLabel>
              <BotyInput
                required
                placeholder="Ej. Sudadera Mr. Paps Negra"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <BotyLabel>Descripción</BotyLabel>
              <BotyTextarea
                placeholder="Opcional — aparece en la página del producto"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <BotyLabel>Categoría *</BotyLabel>
              <BotySelect
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                disabled={isBusy}
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </BotySelect>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive rounded-xl bg-destructive/5 px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <BotyButton type="button" variant="ghost" onClick={onClose} disabled={isBusy}>
              Cancelar
            </BotyButton>
            <BotyButton type="submit" variant="primary" disabled={isBusy || !photoFile || !name.trim()}>
              {isBusy ? "Guardando…" : "Continuar → Variantes"}
            </BotyButton>
          </div>
        </form>
      )}

      {/* STEP 2 — VARIANTS */}
      {step === "variants" && (
        <div className="space-y-5">
          {/* Add one variant */}
          <BotySurface className="p-4">
            <form onSubmit={handleAddToQueue} className="grid gap-3 sm:grid-cols-3">
              <div>
                <BotyLabel>Talla *</BotyLabel>
                <BotySelect
                  value={addSize}
                  onChange={(e) => setAddSize(e.target.value)}
                  disabled={isBusy}
                >
                  {GARMENT_SIZES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </BotySelect>
              </div>
              <div>
                <BotyLabel>Color</BotyLabel>
                <BotyInput
                  value={addColor}
                  onChange={(e) => setAddColor(e.target.value)}
                  placeholder="Ej. Negro, Blanco…"
                  disabled={isBusy}
                />
              </div>
              <div>
                <BotyLabel>Precio MXN *</BotyLabel>
                <BotyInput
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={addPrice}
                  onChange={(e) => setAddPrice(e.target.value)}
                  placeholder="499.00"
                  required
                  disabled={isBusy}
                />
              </div>
              <div className="sm:col-span-3">
                <BotyButton type="submit" variant="secondary" size="sm" disabled={isBusy}>
                  + Agregar talla {addSize}
                </BotyButton>
              </div>
            </form>
          </BotySurface>

          {/* Queue */}
          {variants.length > 0 ? (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Variantes a guardar ({variants.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v, i) => (
                  <VariantPill
                    key={i}
                    v={v}
                    onRemove={() => setVariants((prev) => prev.filter((_, j) => j !== i))}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-3">
              Aún no hay tallas. Agrega al menos una o salta para hacerlo después.
            </p>
          )}

          {error && (
            <p className="text-sm text-destructive rounded-xl bg-destructive/5 px-3 py-2">{error}</p>
          )}

          <div className="flex justify-between gap-3 pt-1">
            <BotyButton type="button" variant="ghost" onClick={() => setStep("info")} disabled={isBusy}>
              ← Atrás
            </BotyButton>
            <div className="flex gap-3">
              <BotyButton type="button" variant="ghost" disabled={isBusy} onClick={() => void handleSaveVariants()}>
                Saltar por ahora
              </BotyButton>
              <BotyButton
                type="button"
                variant="primary"
                disabled={isBusy || variants.length === 0}
                onClick={() => void handleSaveVariants()}
              >
                {isBusy
                  ? "Guardando…"
                  : `Publicar con ${variants.length} variante${variants.length !== 1 ? "s" : ""}`}
              </BotyButton>
            </div>
          </div>
        </div>
      )}
    </BotyModal>
  );
}

// ---------------------------------------------------------------------------
// EDIT MODAL — tabs: info | variants
// ---------------------------------------------------------------------------

type EditProductModalProps = {
  open: boolean;
  product: AdminProductDetail | null;
  onClose: () => void;
  onSaved: () => void;
};

export function EditProductModal({ open, product, onClose, onSaved }: EditProductModalProps) {
  const [tab, setTab] = useState<"info" | "variants">("info");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ProductCategory>("camiseta");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Track which product is open to avoid resetting tab on every reload
  const openedProductId = useRef<string | null>(null);

  useEffect(() => {
    if (!product) return;
    const isNewProduct = product.id !== openedProductId.current;
    if (isNewProduct) {
      // Only reset tab and form fields when opening a different product
      openedProductId.current = product.id;
      setTab("info");
      setPhotoFile(null);
      setPhotoPreview(null);
      setError(null);
    }
    // Always sync latest name/description/status (in case they changed)
    setName(product.name);
    setDescription(product.description ?? "");
    setCategory(product.category ?? "camiseta");
    setStatus(product.status === "active" ? "active" : "inactive");
  }, [product]);

  // Reset tracked id when modal closes
  useEffect(() => {
    if (!open) openedProductId.current = null;
  }, [open]);

  if (!product) return null;

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    setBusy(true);
    setError(null);
    try {
      let thumbnailUrl: string | undefined;
      if (photoFile) {
        const uploaded = await adminUploadAsset(photoFile, {
          kind: "thumbnails",
          productId: product.id,
        });
        thumbnailUrl = uploaded.data.url;
      }
      await adminUpdateProduct(product.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        category,
        ...(thumbnailUrl && { thumbnailUrl }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BotyModal
      open={open}
      onClose={onClose}
      size="xl"
      title={`Editar — ${product.name}`}
      description={`/${product.slug}`}
    >
      <BotyTabs
        tabs={[
          { id: "info", label: "Información" },
          { id: "variants", label: `Variantes (${product.variants.length})` },
        ]}
        active={tab}
        onChange={(id) => setTab(id as "info" | "variants")}
      />

      {tab === "info" && (
        <form onSubmit={(e) => void handleSaveInfo(e)} className="space-y-4">
          <div className="flex gap-4">
            {/* Thumbnail */}
            <label className="relative shrink-0 w-24 h-24 rounded-2xl overflow-hidden border-2 border-dashed border-border/70 hover:border-primary/60 cursor-pointer boty-transition bg-muted/30 flex items-center justify-center group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview ?? product.thumbnailUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <span className="relative z-10 text-xs text-white bg-black/50 rounded-full px-2 py-0.5 opacity-0 group-hover:opacity-100 boty-transition">
                Cambiar
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setPhotoFile(f);
                    setPhotoPreview(URL.createObjectURL(f));
                  }
                }}
              />
            </label>

            <div className="flex-1 space-y-3">
              <div>
                <BotyLabel>Nombre *</BotyLabel>
                <BotyInput
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={busy}
                />
              </div>

              <div>
                <BotyLabel>Categoría</BotyLabel>
                <BotySelect
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProductCategory)}
                  disabled={busy}
                >
                  {PRODUCT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </BotySelect>
              </div>

              {/* Status toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={status === "active"}
                  disabled={busy}
                  onClick={() => setStatus((s) => s === "active" ? "inactive" : "active")}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    status === "active" ? "bg-primary" : "bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                      status === "active" ? "translate-x-6" : "translate-x-1",
                    )}
                  />
                </button>
                <span className="text-sm">
                  {status === "active" ? (
                    <span className="text-emerald-700 font-medium">Activo en tienda</span>
                  ) : (
                    <span className="text-muted-foreground">Oculto en tienda</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div>
            <BotyLabel>Descripción</BotyLabel>
            <BotyTextarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy}
              placeholder="Aparece en la página del producto"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive rounded-xl bg-destructive/5 px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <BotyButton type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Cerrar
            </BotyButton>
            <BotyButton type="submit" variant="primary" disabled={busy}>
              {busy ? "Guardando…" : "Guardar cambios"}
            </BotyButton>
          </div>
        </form>
      )}

      {tab === "variants" && (
        <AdminProductVariantsEditor
          productId={product.id}
          productSlug={product.slug}
          defaultGarmentColor={product.defaultGarmentColor}
          busy={busy}
          setBusy={setBusy}
          onError={setError}
          onChanged={onSaved}
        />
      )}

      {tab === "variants" && error && (
        <p className="mt-3 text-sm text-destructive rounded-xl bg-destructive/5 px-3 py-2">{error}</p>
      )}
    </BotyModal>
  );
}
