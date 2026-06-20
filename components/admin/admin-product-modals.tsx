"use client";

import { useEffect, useRef, useState } from "react";
import type { VariantsEditorHandle } from "@/components/admin/admin-product-variants-editor";
import {
  adminCreateProduct,
  adminUpdateProduct,
} from "@/lib/api";
import type { AdminProductDetail } from "@/lib/api-types";
import type { ColorImageEntry } from "@/components/admin/admin-color-images";
import {
  PRODUCT_CATEGORIES,
  type ProductCategory,
} from "@/lib/product-categories";
import { cn } from "@/lib/utils";
import { slugifyName } from "@/lib/composer-export";
import {
  BotyButton,
  BotyInput,
  BotyLabel,
  BotyModal,
  BotyTabs,
  BotyTextarea,
} from "@/components/boty/ui-patterns";
import { AdminDrawer } from "@/components/admin/admin-drawer";
import { AdminProductVariantsEditor } from "@/components/admin/admin-product-variants-editor";
import { AdminColorImages } from "@/components/admin/admin-color-images";
import { AdminSelect } from "@/components/admin/admin-select";

// ─── CREAR PRODUCTO ──────────────────────────────────────────────────────────

type CreateProductModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (productId: string, productSlug: string) => void;
};

type CreateStep = "info" | "colors-and-variants";

export function CreateProductModal({ open, onClose, onCreated }: CreateProductModalProps) {
  const [step, setStep] = useState<CreateStep>("info");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ProductCategory>("camiseta");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [productColors, setProductColors] = useState<ColorImageEntry[]>([]);

  useEffect(() => {
    if (!open) {
      setStep("info");
      setName("");
      setDescription("");
      setCategory("camiseta");
      setCreatedId(null);
      setCreatedSlug(null);
      setProductColors([]);
      setError(null);
    }
  }, [open]);

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const slug = slugifyName(name);
      const res = await adminCreateProduct({ name: name.trim(), slug, description: description.trim() || undefined, category });
      setCreatedId(res.data.id);
      setCreatedSlug(res.data.slug);
      setStep("colors-and-variants");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el producto");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BotyModal
      open={open}
      onClose={onClose}
      size="lg"
      title={step === "info" ? "Nuevo producto" : `"${name}" — colores y tallas`}
      description={
        step === "info"
          ? "Nombre, descripción y categoría."
          : "Agrega los colores con foto y las tallas disponibles."
      }
    >
      {/* PASO 1 */}
      {step === "info" && (
        <form onSubmit={(e) => void handleStep1(e)} className="space-y-4">
          <div>
            <BotyLabel>Nombre del producto *</BotyLabel>
            <BotyInput required placeholder="Ej. Sudadera Mr. Paps" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
          </div>
          <div>
            <BotyLabel>Descripción</BotyLabel>
            <BotyTextarea placeholder="Aparece en la página del producto" value={description} onChange={(e) => setDescription(e.target.value)} disabled={busy} />
          </div>
          <div>
            <BotyLabel>Categoría *</BotyLabel>
            <AdminSelect value={category} onValueChange={(v) => setCategory(v as ProductCategory)} disabled={busy} options={PRODUCT_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))} />
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/5 rounded-xl px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <BotyButton type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</BotyButton>
            <BotyButton type="submit" variant="primary" disabled={busy || !name.trim()}>
              {busy ? "Creando…" : "Continuar →"}
            </BotyButton>
          </div>
        </form>
      )}

      {/* PASO 2 */}
      {step === "colors-and-variants" && createdId && createdSlug && (
        <div className="space-y-6">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Colores y fotos</h3>
            <AdminColorImages productId={createdId} onError={setError} onColorsChanged={setProductColors} />
          </section>

          <hr className="border-border/40" />

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Tallas y stock</h3>
            <AdminProductVariantsEditor
              productId={createdId}
              productSlug={createdSlug}
              productColors={productColors}
              busy={busy}
              setBusy={setBusy}
              onError={setError}
            />
          </section>

          {error && <p className="text-sm text-destructive bg-destructive/5 rounded-xl px-3 py-2">{error}</p>}

          <div className="flex justify-between pt-2">
            <BotyButton type="button" variant="ghost" onClick={() => setStep("info")}>← Atrás</BotyButton>
            <BotyButton type="button" variant="primary" onClick={() => { onCreated(createdId, createdSlug); onClose(); }}>
              Publicar producto
            </BotyButton>
          </div>
        </div>
      )}
    </BotyModal>
  );
}

// ─── EDITAR PRODUCTO ─────────────────────────────────────────────────────────

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
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ProductCategory>("camiseta");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [productColors, setProductColors] = useState<ColorImageEntry[]>([]);
  const [variantsDirtyCount, setVariantsDirtyCount] = useState(0);

  const openedProductId = useRef<string | null>(null);
  const variantsEditorRef = useRef<VariantsEditorHandle>(null);

  useEffect(() => {
    if (!product) return;
    const isNew = product.id !== openedProductId.current;
    if (isNew) {
      openedProductId.current = product.id;
      setTab("info");
      setError(null);
      setSaved(false);
      setVariantsDirtyCount(0);
      setProductColors(product.colorImages ?? []);
    }
    setName(product.name);
    setDescription(product.description ?? "");
    setCategory(product.category ?? "camiseta");
    setStatus(product.status === "active" ? "active" : "inactive");
  }, [product]);

  useEffect(() => {
    if (!open) openedProductId.current = null;
  }, [open]);

  if (!product) return null;

  async function handleSaveInfo(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await adminUpdateProduct(product!.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        category,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveVariants() {
    await variantsEditorRef.current?.saveAllDirty();
  }

  const saveLabel = tab === "info"
    ? (busy ? "Guardando…" : "Guardar cambios")
    : (busy ? "Guardando…" : variantsDirtyCount > 0
        ? `Guardar ${variantsDirtyCount} cambio${variantsDirtyCount > 1 ? "s" : ""}`
        : "Guardar cambios");

  const saveDisabled = tab === "info"
    ? (busy || !name.trim())
    : (busy || variantsDirtyCount === 0);

  function handleSave() {
    if (tab === "info") {
      void handleSaveInfo();
    } else {
      void handleSaveVariants();
    }
  }

  const drawerFooter = (
    <div className="flex items-center justify-between gap-3">
      <p className={cn(
        "text-sm transition-opacity duration-300",
        saved ? "text-emerald-600 opacity-100" : "opacity-0",
      )}>
        ✓ Cambios guardados
      </p>
      <div className="flex gap-2 ml-auto">
        <BotyButton type="button" variant="ghost" onClick={onClose} disabled={busy}>
          Cerrar
        </BotyButton>
        <BotyButton
          type="button"
          variant="primary"
          disabled={saveDisabled}
          onClick={handleSave}
        >
          {saveLabel}
        </BotyButton>
      </div>
    </div>
  );

  return (
    <AdminDrawer
      open={open}
      onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}
      title={`Editar — ${product.name}`}
      description={`/${product.slug}`}
      footer={drawerFooter}
    >
      <BotyTabs
        tabs={[
          { id: "info", label: "Información" },
          { id: "variants", label: `Variantes (${product.variants.length})` },
        ]}
        active={tab}
        onChange={(id) => { setTab(id as "info" | "variants"); setError(null); }}
      />

      {/* ── PESTAÑA INFORMACIÓN ────────────────────────────────────────────── */}
      {tab === "info" && (
        <form id="edit-info-form" onSubmit={(e) => void handleSaveInfo(e)} className="space-y-5 pb-2">
          {/* Campos de texto */}
          <div className="space-y-4">
            <div>
              <BotyLabel>Nombre del producto</BotyLabel>
              <BotyInput required value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <BotyLabel>Categoría</BotyLabel>
                <AdminSelect
                  value={category}
                  onValueChange={(v) => setCategory(v as ProductCategory)}
                  disabled={busy}
                  options={PRODUCT_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
                />
              </div>
              <div className="flex flex-col justify-end">
                {/* Toggle estado */}
                <label className="flex items-center gap-3 cursor-pointer select-none pb-1">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={status === "active"}
                    disabled={busy}
                    onClick={() => setStatus((s) => s === "active" ? "inactive" : "active")}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0",
                      status === "active" ? "bg-primary" : "bg-muted",
                    )}
                  >
                    <span className={cn(
                      "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                      status === "active" ? "translate-x-6" : "translate-x-1",
                    )} />
                  </button>
                  <span className="text-sm">
                    {status === "active"
                      ? <span className="text-emerald-700 font-medium">Activo en tienda</span>
                      : <span className="text-muted-foreground">Oculto en tienda</span>}
                  </span>
                </label>
              </div>
            </div>

            <div>
              <BotyLabel>Descripción</BotyLabel>
              <BotyTextarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={busy} placeholder="Aparece en la página del producto" />
            </div>
          </div>

          {/* Error info */}
          {error && tab === "info" && (
            <p className="text-sm text-destructive bg-destructive/5 rounded-xl px-3 py-2">{error}</p>
          )}

          {/* Sección colores */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                Colores y fotos
              </span>
              <hr className="flex-1 border-border/40" />
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Foto por color — se muestra al seleccionar en tienda. Las acciones son inmediatas.
            </p>
            <AdminColorImages
              productId={product.id}
              disabled={busy}
              onError={setError}
              onColorsChanged={setProductColors}
            />
          </div>
        </form>
      )}

      {/* ── PESTAÑA VARIANTES ─────────────────────────────────────────────── */}
      {tab === "variants" && (
        <>
          <AdminProductVariantsEditor
            ref={variantsEditorRef}
            productId={product.id}
            productSlug={product.slug}
            productColors={productColors}
            defaultGarmentColor={product.defaultGarmentColor}
            busy={busy}
            setBusy={setBusy}
            onError={setError}
            onChanged={onSaved}
            onDirtyCountChange={setVariantsDirtyCount}
          />
          {error && (
            <p className="mt-4 text-sm text-destructive bg-destructive/5 rounded-xl px-3 py-2">{error}</p>
          )}
        </>
      )}
    </AdminDrawer>
  );
}
