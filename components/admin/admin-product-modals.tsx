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
  BotySurface,
  BotyTabs,
  BotyTextarea,
} from "@/components/boty/ui-patterns";
import { AdminDrawer } from "@/components/admin/admin-drawer";
import { AdminProductVariantsEditor } from "@/components/admin/admin-product-variants-editor";
import { AdminColorImages } from "@/components/admin/admin-color-images";
import {
  AdminProductGallery,
  MAX_PRODUCT_GALLERY,
  reorderGallery,
  setPrimaryGallery,
} from "@/components/admin/admin-product-gallery";
import { AdminSelect } from "@/components/admin/admin-select";

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
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

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
      setPhotoFiles([]);
      setPhotoPreviews([]);
      setCreatedId(null);
      setCreatedSlug(null);
      setVariants([]);
      setAddSize(GARMENT_SIZES[2]);
      setAddColor("Estándar");
      setAddPrice("");
      setError(null);
    }
  }, [open]);

  function pickPhotos(files: File[]) {
    const remaining = MAX_PRODUCT_GALLERY - photoFiles.length;
    const batch = files.slice(0, remaining);
    if (batch.length === 0) return;
    setPhotoFiles((prev) => [...prev, ...batch]);
    setPhotoPreviews((prev) => [...prev, ...batch.map((f) => URL.createObjectURL(f))]);
  }

  function removePendingPhoto(index: number) {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function movePendingPhoto(from: number, to: number) {
    setPhotoFiles((prev) => reorderGallery(prev, from, to));
    setPhotoPreviews((prev) => reorderGallery(prev, from, to));
  }

  function setPrimaryPendingPhoto(index: number) {
    setPhotoFiles((prev) => setPrimaryGallery(prev, index));
    setPhotoPreviews((prev) => setPrimaryGallery(prev, index));
  }

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    if (photoFiles.length === 0) { setError("Sube al menos una foto del producto."); return; }
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
      const galleryUrls: string[] = [];
      for (const file of photoFiles) {
        const uploaded = await adminUploadAsset(file, {
          kind: "thumbnails",
          productId: res.data.id,
        });
        galleryUrls.push(uploaded.data.url);
      }
      await adminUpdateProduct(res.data.id, { galleryUrls });
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
            <AdminProductGallery
              urls={photoPreviews}
              disabled={isBusy}
              onAddFiles={pickPhotos}
              onRemove={removePendingPhoto}
              onMove={movePendingPhoto}
              onSetPrimary={setPrimaryPendingPhoto}
            />
            {photoPreviews.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                PNG, JPG o WebP. Puedes seleccionar varias a la vez.
              </p>
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
              <AdminSelect
                value={category}
                onValueChange={(v) => setCategory(v as ProductCategory)}
                disabled={isBusy}
                options={PRODUCT_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive rounded-xl bg-destructive/5 px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <BotyButton type="button" variant="ghost" onClick={onClose} disabled={isBusy}>
              Cancelar
            </BotyButton>
            <BotyButton type="submit" variant="primary" disabled={isBusy || photoFiles.length === 0 || !name.trim()}>
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
                <AdminSelect
                  value={addSize}
                  onValueChange={setAddSize}
                  disabled={isBusy}
                  options={GARMENT_SIZES.map((s) => ({ value: s, label: s }))}
                />
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
  const [tab, setTab] = useState<"info" | "variants" | "color-images">("info");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ProductCategory>("camiseta");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);

  // Track which product is open to avoid resetting tab on every reload
  const openedProductId = useRef<string | null>(null);

  useEffect(() => {
    if (!product) return;
    const isNewProduct = product.id !== openedProductId.current;
    if (isNewProduct) {
      // Only reset tab and form fields when opening a different product
      openedProductId.current = product.id;
      setTab("info");
      setPendingFiles([]);
      setPendingPreviews([]);
      setGalleryUrls(product.galleryUrls?.length ? product.galleryUrls : [product.thumbnailUrl].filter(Boolean));
      setError(null);
    }
    // Always sync latest name/description/status (in case they changed)
    setName(product.name);
    setDescription(product.description ?? "");
    setCategory(product.category ?? "camiseta");
    setStatus(product.status === "active" ? "active" : "inactive");
    if (product.id === openedProductId.current) {
      setGalleryUrls(product.galleryUrls?.length ? product.galleryUrls : [product.thumbnailUrl].filter(Boolean));
    }
  }, [product]);

  // Reset tracked id when modal closes
  useEffect(() => {
    if (!open) openedProductId.current = null;
  }, [open]);

  if (!product) return null;

  function addPendingFiles(files: File[]) {
    const total = galleryUrls.length + pendingFiles.length;
    const batch = files.slice(0, MAX_PRODUCT_GALLERY - total);
    if (batch.length === 0) return;
    setPendingFiles((prev) => [...prev, ...batch]);
    setPendingPreviews((prev) => [...prev, ...batch.map((f) => URL.createObjectURL(f))]);
  }

  function removeGalleryPhoto(index: number) {
    setGalleryUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function moveGalleryPhoto(from: number, to: number) {
    setGalleryUrls((prev) => reorderGallery(prev, from, to));
  }

  function setPrimaryGalleryPhoto(index: number) {
    setGalleryUrls((prev) => setPrimaryGallery(prev, index));
  }

  function removePendingGalleryPhoto(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setPendingPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    const totalPhotos = galleryUrls.length + pendingFiles.length;
    if (totalPhotos === 0) {
      setError("El producto debe tener al menos una foto.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const uploadedUrls: string[] = [];
      for (const file of pendingFiles) {
        const uploaded = await adminUploadAsset(file, {
          kind: "thumbnails",
          productId: product.id,
        });
        uploadedUrls.push(uploaded.data.url);
      }
      const nextGallery = [...galleryUrls, ...uploadedUrls].slice(0, MAX_PRODUCT_GALLERY);

      await adminUpdateProduct(product.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        category,
        galleryUrls: nextGallery,
      });
      setPendingFiles([]);
      setPendingPreviews([]);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminDrawer
      open={open}
      onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}
      title={`Editar — ${product.name}`}
      description={`/${product.slug}`}
    >
      <BotyTabs
        tabs={[
          { id: "info", label: "Información" },
          { id: "variants", label: `Variantes (${product.variants.length})` },
          { id: "color-images", label: "Fotos por color" },
        ]}
        active={tab}
        onChange={(id) => setTab(id as "info" | "variants" | "color-images")}
      />

      {tab === "info" && (
        <form onSubmit={(e) => void handleSaveInfo(e)} className="space-y-4">
          <AdminProductGallery
            urls={galleryUrls}
            pendingPreviews={pendingPreviews}
            disabled={busy}
            onAddFiles={addPendingFiles}
            onRemove={removeGalleryPhoto}
            onRemovePending={removePendingGalleryPhoto}
            onMove={moveGalleryPhoto}
            onSetPrimary={setPrimaryGalleryPhoto}
          />

          <div className="space-y-3">
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
                <AdminSelect
                  value={category}
                  onValueChange={(v) => setCategory(v as ProductCategory)}
                  disabled={busy}
                  options={PRODUCT_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
                />
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

      {tab === "color-images" && (
        <AdminColorImages
          productId={product.id}
          variants={product.variants}
          disabled={busy}
          onError={setError}
        />
      )}

      {tab === "color-images" && error && (
        <p className="mt-3 text-sm text-destructive rounded-xl bg-destructive/5 px-3 py-2">{error}</p>
      )}
    </AdminDrawer>
  );
}
