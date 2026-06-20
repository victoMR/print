"use client";

import { useEffect, useRef, useState } from "react";
import {
  adminCreateProduct,
  adminUpdateProduct,
} from "@/lib/api";
import type { AdminProductDetail } from "@/lib/api-types";
import type { ColorImageEntry } from "@/components/admin/admin-color-images";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type ProductCategory,
} from "@/lib/product-categories";
import { cn } from "@/lib/utils";
import { slugifyName } from "@/lib/composer-export";
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
import { AdminSelect } from "@/components/admin/admin-select";

// ---------------------------------------------------------------------------
// CREATE MODAL — 2 pasos: Info → Colores y tallas
// ---------------------------------------------------------------------------

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

  // Paso 1
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ProductCategory>("camiseta");

  // Paso 2 — producto ya creado
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
      const res = await adminCreateProduct({
        name: name.trim(),
        slug,
        description: description.trim() || undefined,
        category,
      });
      setCreatedId(res.data.id);
      setCreatedSlug(res.data.slug);
      setStep("colors-and-variants");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el producto");
    } finally {
      setBusy(false);
    }
  }

  function handleFinish() {
    if (!createdId || !createdSlug) return;
    onCreated(createdId, createdSlug);
    onClose();
  }

  return (
    <BotyModal
      open={open}
      onClose={onClose}
      size="lg"
      title={step === "info" ? "Nuevo producto" : `Colores y tallas — "${name}"`}
      description={
        step === "info"
          ? "Nombre, descripción y categoría. Los colores y fotos se agregan en el siguiente paso."
          : "Define los colores del producto con su foto, y agrega las tallas disponibles."
      }
    >
      {/* PASO 1 — INFO */}
      {step === "info" && (
        <form onSubmit={(e) => void handleStep1(e)} className="space-y-5">
          <div className="space-y-4">
            <div>
              <BotyLabel>Nombre del producto *</BotyLabel>
              <BotyInput
                required
                placeholder="Ej. Sudadera Mr. Paps"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
              />
            </div>
            <div>
              <BotyLabel>Descripción</BotyLabel>
              <BotyTextarea
                placeholder="Opcional — aparece en la página del producto"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={busy}
              />
            </div>
            <div>
              <BotyLabel>Categoría *</BotyLabel>
              <AdminSelect
                value={category}
                onValueChange={(v) => setCategory(v as ProductCategory)}
                disabled={busy}
                options={PRODUCT_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive rounded-xl bg-destructive/5 px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <BotyButton type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Cancelar
            </BotyButton>
            <BotyButton type="submit" variant="primary" disabled={busy || !name.trim()}>
              {busy ? "Creando…" : "Continuar → Colores y tallas"}
            </BotyButton>
          </div>
        </form>
      )}

      {/* PASO 2 — COLORES Y VARIANTES */}
      {step === "colors-and-variants" && createdId && createdSlug && (
        <div className="space-y-6">
          {/* Colores con fotos */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Colores del producto</h3>
            <AdminColorImages
              productId={createdId}
              disabled={false}
              onError={setError}
              onColorsChanged={setProductColors}
            />
          </div>

          <hr className="border-border/50" />

          {/* Variantes */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Tallas y stock</h3>
            <AdminProductVariantsEditor
              productId={createdId}
              productSlug={createdSlug}
              productColors={productColors}
              busy={false}
              setBusy={setBusy}
              onError={setError}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive rounded-xl bg-destructive/5 px-3 py-2">{error}</p>
          )}

          <div className="flex justify-between gap-3 pt-1">
            <BotyButton type="button" variant="ghost" onClick={() => setStep("info")}>
              ← Atrás
            </BotyButton>
            <BotyButton type="button" variant="primary" onClick={handleFinish}>
              Publicar producto
            </BotyButton>
          </div>
        </div>
      )}
    </BotyModal>
  );
}

// ---------------------------------------------------------------------------
// EDIT MODAL — pestañas: Información | Variantes
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

  // Colores del producto (sincronizados desde AdminColorImages)
  const [productColors, setProductColors] = useState<ColorImageEntry[]>([]);

  const openedProductId = useRef<string | null>(null);

  useEffect(() => {
    if (!product) return;
    const isNewProduct = product.id !== openedProductId.current;
    if (isNewProduct) {
      openedProductId.current = product.id;
      setTab("info");
      setError(null);
      // Cargar colores desde los datos del producto si existen
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

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    setBusy(true);
    setError(null);
    try {
      await adminUpdateProduct(product.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        category,
      });
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
        ]}
        active={tab}
        onChange={(id) => setTab(id as "info" | "variants")}
      />

      {/* PESTAÑA INFO — nombre, desc, categoría, estado + colores con fotos */}
      {tab === "info" && (
        <div className="space-y-6">
          <form onSubmit={(e) => void handleSaveInfo(e)} className="space-y-4">
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

            <div>
              <BotyLabel>Descripción</BotyLabel>
              <BotyTextarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={busy}
                placeholder="Aparece en la página del producto"
              />
            </div>

            {/* Estado activo/inactivo */}
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

            {error && tab === "info" && (
              <p className="text-sm text-destructive rounded-xl bg-destructive/5 px-3 py-2">{error}</p>
            )}

            <div className="flex justify-end gap-3">
              <BotyButton type="button" variant="ghost" onClick={onClose} disabled={busy}>
                Cerrar
              </BotyButton>
              <BotyButton type="submit" variant="primary" disabled={busy}>
                {busy ? "Guardando…" : "Guardar info"}
              </BotyButton>
            </div>
          </form>

          {/* Colores con fotos — separador visual */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <hr className="flex-1 border-border/50" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Colores y fotos del producto
              </span>
              <hr className="flex-1 border-border/50" />
            </div>

            <AdminColorImages
              productId={product.id}
              disabled={busy}
              onError={setError}
              onColorsChanged={setProductColors}
            />
          </div>
        </div>
      )}

      {/* PESTAÑA VARIANTES */}
      {tab === "variants" && (
        <>
          <AdminProductVariantsEditor
            productId={product.id}
            productSlug={product.slug}
            productColors={productColors}
            defaultGarmentColor={product.defaultGarmentColor}
            busy={busy}
            setBusy={setBusy}
            onError={setError}
            onChanged={onSaved}
          />
          {error && (
            <p className="mt-3 text-sm text-destructive rounded-xl bg-destructive/5 px-3 py-2">{error}</p>
          )}
        </>
      )}
    </AdminDrawer>
  );
}
