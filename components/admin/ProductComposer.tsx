"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminProductVariantsEditor } from "@/components/admin/admin-product-variants-editor";
import {
  adminCreateProduct,
  adminCreateProductVariant,
  adminGetProduct,
  adminListDesigns,
  adminListTemplates,
  adminUpdateProduct,
  adminUpdateProductVariant,
  adminUploadAsset,
} from "@/lib/api";
import type { AdminDesign, GarmentTemplate, GarmentTemplateView, ProductComposition } from "@/lib/api-types";
import {
  centerPlacement,
  exportMockupPreview,
  exportPrintFile,
  fromProductComposition,
  slugifyName,
  toProductComposition,
  type ComposerPlacement,
} from "@/lib/composer-export";
import { MockupCanvas } from "@/components/admin/MockupCanvas";
import { GARMENT_SIZES } from "@/lib/garment-sizes";
import { cn } from "@/lib/utils";
import {
  mockupAspectRatio,
  printAreaInCropSpace,
} from "@/lib/mockup-layout";

type ProductComposerProps = {
  busy: boolean;
  setBusy: (v: boolean) => void;
  onError: (msg: string | null) => void;
  editProductId?: string | null;
  onEditDone?: () => void;
  onSaved?: () => void;
  /** Solo mockups/archivos para imprenta; no publica en tienda. */
  prototypeMode?: boolean;
};

const GARMENT_TYPE_LABEL: Record<GarmentTemplate["garmentType"], string> = {
  tshirt: "Camiseta",
  hoodie: "Sudadera",
  cap: "Gorra",
};

const SIZE_OPTIONS = GARMENT_SIZES.filter((s) => s !== "XS" && s !== "XXL");

function newPlacement(designId: string): ComposerPlacement {
  return {
    localId: crypto.randomUUID(),
    designId,
    x: 0.15,
    y: 0.12,
    width: 0.7,
    rotation: 0,
  };
}

export function ProductComposer({
  busy,
  setBusy,
  onError,
  editProductId,
  onEditDone,
  onSaved,
  prototypeMode = false,
}: ProductComposerProps) {
  const isEditing = Boolean(editProductId);

  const [templates, setTemplates] = useState<GarmentTemplate[]>([]);
  const [designs, setDesigns] = useState<AdminDesign[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [viewId, setViewId] = useState<string>("");
  const [garmentColor, setGarmentColor] = useState("#FFFFFF");
  const [placementsByView, setPlacementsByView] = useState<Record<string, ComposerPlacement[]>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [existingVariantIds, setExistingVariantIds] = useState<string[]>([]);
  const [editProductSlug, setEditProductSlug] = useState("");

  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");
  const [selectedSizes, setSelectedSizes] = useState<string[]>(["M"]);
  const [colorLabel, setColorLabel] = useState("Blanco");
  const [priceMxn, setPriceMxn] = useState("499");

  const template = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId],
  );

  const view: GarmentTemplateView | null = useMemo(() => {
    if (!template) return null;
    return template.views.find((v) => v.id === viewId) ?? template.views[0] ?? null;
  }, [template, viewId]);

  const currentPlacements = view ? (placementsByView[view.id] ?? []) : [];
  const designMap = useMemo(() => new Map(designs.map((d) => [d.id, d])), [designs]);

  const loadBase = useCallback(async () => {
    onError(null);
    const [tRes, dRes] = await Promise.all([adminListTemplates(), adminListDesigns()]);
    setTemplates(tRes.data);
    setDesigns(dRes.data);
    if (!editProductId && tRes.data[0]) {
      setTemplateId((prev) => prev || tRes.data[0].id);
      setViewId((prev) => prev || (tRes.data[0].views[0]?.id ?? ""));
    }
  }, [onError, editProductId]);

  const loadProductForEdit = useCallback(async () => {
    if (!editProductId) return;
    onError(null);
    try {
      const res = await adminGetProduct(editProductId);
      const product = res.data;
      setProductName(product.name);
      setEditProductSlug(product.slug);
      setExistingVariantIds(product.variants.map((v) => v.id));

      if (product.templateId) setTemplateId(product.templateId);
      if (product.defaultGarmentColor) setGarmentColor(product.defaultGarmentColor);

      const comp = product.composition as ProductComposition | undefined;
      if (comp?.garmentColor) setGarmentColor(comp.garmentColor);
      if (comp?.views && Object.keys(comp.views).length > 0) {
        setPlacementsByView(fromProductComposition(comp));
        const firstView = comp.primaryPrintView ?? Object.keys(comp.views)[0];
        if (firstView) setViewId(firstView);
      }

      if (product.variants[0]) {
        setColorLabel(product.variants[0].color);
        setPriceMxn(product.variants[0].retailPriceMxn);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo cargar el producto");
    }
  }, [editProductId, onError]);

  useEffect(() => {
    void loadBase();
  }, [loadBase]);

  useEffect(() => {
    if (editProductId) void loadProductForEdit();
    else {
      setExistingVariantIds([]);
      setEditProductSlug("");
      setPlacementsByView({});
      setProductName("");
      setGarmentColor("#FFFFFF");
    }
  }, [editProductId, loadProductForEdit]);

  useEffect(() => {
    if (template?.views[0] && !viewId) {
      setViewId(template.views[0].id);
    }
  }, [template, viewId]);

  useEffect(() => {
    if (!editProductId || !templateId || templates.length === 0) return;
    if (templates.some((t) => t.id === templateId)) return;
    const fallback = templates[0];
    if (!fallback) return;
    setTemplateId(fallback.id);
    setViewId(fallback.views[0]?.id ?? "");
    onError(
      "La plantilla de este producto ya no está disponible (SVG retirados). Se seleccionó «" +
        fallback.name +
        "» — guarda el producto para aplicar el cambio.",
    );
  }, [editProductId, templateId, templates, onError]);

  function updatePlacement(localId: string, patch: Partial<ComposerPlacement>) {
    if (!view) return;
    setPlacementsByView((prev) => ({
      ...prev,
      [view.id]: (prev[view.id] ?? []).map((p) =>
        p.localId === localId ? { ...p, ...patch } : p,
      ),
    }));
  }

  function addPlacement(designId: string) {
    if (!view) return;
    const p = newPlacement(designId);
    setPlacementsByView((prev) => ({
      ...prev,
      [view.id]: [...(prev[view.id] ?? []), p],
    }));
    setSelectedId(p.localId);
  }

  function removePlacement(localId: string) {
    if (!view) return;
    setPlacementsByView((prev) => ({
      ...prev,
      [view.id]: (prev[view.id] ?? []).filter((p) => p.localId !== localId),
    }));
    if (selectedId === localId) setSelectedId(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const designId = e.dataTransfer.getData("text/design-id");
    if (designId) addPlacement(designId);
  }

  function duplicateToBack() {
    if (!template || !view) return;
    const backView = template.views.find((v) => v.id === "back");
    if (!backView || currentPlacements.length === 0) return;
    setPlacementsByView((prev) => ({
      ...prev,
      [backView.id]: currentPlacements.map((p) => ({
        ...p,
        localId: crypto.randomUUID(),
      })),
    }));
    setViewId(backView.id);
  }

  function toggleSize(size: string) {
    setSelectedSizes((prev) =>
      prev.includes(size) ? (prev.length > 1 ? prev.filter((s) => s !== size) : prev) : [...prev, size],
    );
  }

  async function handleExportPrototype() {
    if (!template || !view) return;
    const allPlacements = Object.values(placementsByView).flat();
    if (allPlacements.length === 0) {
      onError("Coloca al menos un diseño en la plantilla.");
      return;
    }

    setBusy(true);
    onError(null);
    try {
      const designUrls = new Map(designs.map((d) => [d.id, d.fileUrl]));
      const links: string[] = [];
      const stagingId = crypto.randomUUID();

      for (const v of template.views) {
        const viewPlacements = placementsByView[v.id] ?? [];
        if (viewPlacements.length === 0) continue;
        const printBlob = await exportPrintFile({
          view: v,
          placements: viewPlacements,
          designUrls,
        });
        const uploadedPrint = await adminUploadAsset(printBlob, {
          kind: "exports",
          stagingId,
        });
        links.push(`${v.label}: ${uploadedPrint.data.url}`);
      }

      const previewView =
        template.views.find((v) => (placementsByView[v.id]?.length ?? 0) > 0) ?? view;
      const mockBlob = await exportMockupPreview({
        view: previewView,
        garmentColor,
        placements: placementsByView[previewView.id] ?? [],
        designUrls,
      });
      const uploadedMock = await adminUploadAsset(mockBlob, {
        kind: "previews",
        stagingId,
      });
      links.push(`Vista previa: ${uploadedMock.data.url}`);

      onError(
        `Archivos listos para imprenta:\n${links.join("\n")}\n(Copia los enlaces antes de cerrar)`,
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo exportar el prototipo");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!template || !view) return;

    if (prototypeMode && !isEditing) {
      await handleExportPrototype();
      return;
    }

    const allPlacements = Object.values(placementsByView).flat();
    if (allPlacements.length === 0) {
      onError("Coloca al menos un diseño en la plantilla.");
      return;
    }

    const price = Number.parseFloat(priceMxn);
    if (!Number.isFinite(price) || price <= 0) {
      onError("Indica un precio válido en MXN.");
      return;
    }

    setBusy(true);
    onError(null);
    try {
      const designUrls = new Map(designs.map((d) => [d.id, d.fileUrl]));
      const previewView =
        template.views.find((v) => (placementsByView[v.id]?.length ?? 0) > 0) ?? view;

      const name = productName.trim() || "Producto nuevo";
      const slug = slugifyName(name);
      const firstDesignId = allPlacements[0]?.designId ?? null;

      let productId = editProductId ?? "";

      if (isEditing && editProductId) {
        productId = editProductId;
      } else {
        const product = await adminCreateProduct({
          name,
          slug,
          templateId: template.id,
          defaultGarmentColor: garmentColor,
          retailPriceMxn: price,
        });
        productId = product.data.id;
      }

      const printFileUrls: Record<string, string> = {};
      for (const v of template.views) {
        const viewPlacements = placementsByView[v.id] ?? [];
        if (viewPlacements.length === 0) continue;
        const printBlob = await exportPrintFile({
          view: v,
          placements: viewPlacements,
          designUrls,
        });
        const uploadedPrint = await adminUploadAsset(printBlob, {
          kind: "exports",
          productId,
        });
        printFileUrls[v.id] = uploadedPrint.data.url;
      }

      const blob = await exportMockupPreview({
        view: previewView,
        garmentColor,
        placements: placementsByView[previewView.id] ?? [],
        designUrls,
      });

      const uploaded = await adminUploadAsset(blob, {
        kind: "previews",
        productId,
      });
      const composition = toProductComposition(
        template.id,
        garmentColor,
        placementsByView,
        designUrls,
        printFileUrls,
        previewView.id,
      );

      if (isEditing && editProductId) {
        await adminUpdateProduct(editProductId, {
          name,
          thumbnailUrl: uploaded.data.url,
          templateId: template.id,
          composition,
          defaultGarmentColor: garmentColor,
        });

        if (existingVariantIds.length === 0) {
          const skuBase = sku.trim() || `${slug}-m-${slugifyName(colorLabel)}`;
          await adminCreateProductVariant(editProductId, {
            sku: skuBase.slice(0, 50),
            sizeLabel: "M",
            colorLabel: colorLabel || "Estándar",
            retailPriceMxn: price,
            designId: firstDesignId,
            garmentColorHex: garmentColor,
          });
        } else {
          await Promise.all(
            existingVariantIds.map((variantId) =>
              adminUpdateProductVariant(variantId, {
                designId: firstDesignId,
                garmentColorHex: garmentColor,
              }),
            ),
          );
        }

        onEditDone?.();
      } else {
        await adminUpdateProduct(productId, {
          thumbnailUrl: uploaded.data.url,
          composition,
        });

        for (const size of selectedSizes) {
          const skuBase = sku.trim() || `${slug}-${size.toLowerCase()}-${slugifyName(colorLabel)}`;
          await adminCreateProductVariant(productId, {
            sku: skuBase.slice(0, 50),
            sizeLabel: size,
            colorLabel,
            retailPriceMxn: price,
            designId: firstDesignId,
            garmentColorHex: garmentColor,
          });
        }

        setProductName("");
        setSku("");
        setSelectedSizes(["M"]);
        setPlacementsByView({});
        setSelectedId(null);
        onSaved?.();
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo guardar el producto");
    } finally {
      setBusy(false);
    }
  }

  const selected = currentPlacements.find((p) => p.localId === selectedId) ?? null;
  const canvasAspect = view ? mockupAspectRatio(view) : 1402 / 1122;
  const cropPrintArea = view ? printAreaInCropSpace(view) : null;

  return (
    <form onSubmit={(e) => void handleSave(e)} className="space-y-6">
      {isEditing && editProductId && (
        <>
          <div className="bg-primary/10 border border-primary/20 rounded-2xl px-4 py-3 text-sm">
            Editando producto — mockup, composición y archivos de impresión. Tallas y precios en el
            panel de abajo.
            <button
              type="button"
              onClick={() => onEditDone?.()}
              className="ml-3 text-primary underline text-xs"
            >
              Cancelar edición
            </button>
          </div>
          <AdminProductVariantsEditor
            productId={editProductId}
            productSlug={editProductSlug}
            defaultGarmentColor={garmentColor}
            busy={busy}
            setBusy={setBusy}
            onError={onError}
          />
        </>
      )}

      <div className="bg-card rounded-2xl p-5 boty-shadow space-y-4">
        <div>
          <h2 className="font-serif text-lg">
            {prototypeMode
              ? isEditing
                ? "Editar prototipo"
                : "Prototipo para imprenta"
              : isEditing
                ? "Editar composición"
                : "Compositor de producto"}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {prototypeMode
              ? "Genera mockups y archivos 300 DPI para enviar a imprentas locales. La foto del catálogo se sube en Productos."
              : "Plantillas con mockups PNG (como la sudadera). Arrastra diseños al área de impresión."}
          </p>
        </div>

        {templates.length === 0 && (
          <p className="text-sm text-amber-700 bg-amber-500/10 rounded-xl p-3">
            No hay plantillas activas. Añade PNG en{" "}
            <code className="text-xs">public/images/plantillas/</code> y regístralas en Supabase.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm space-y-1">
            <span className="text-muted-foreground">Plantilla</span>
            <select
              value={templateId}
              onChange={(e) => {
                setTemplateId(e.target.value);
                const t = templates.find((x) => x.id === e.target.value);
                setViewId(t?.views[0]?.id ?? "");
              }}
              className="w-full rounded-xl border border-border px-3 py-2 bg-background text-sm"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({GARMENT_TYPE_LABEL[t.garmentType]})
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm space-y-1">
            <span className="text-muted-foreground">Vista</span>
            <select
              value={viewId}
              onChange={(e) => setViewId(e.target.value)}
              className="w-full rounded-xl border border-border px-3 py-2 bg-background text-sm"
            >
              {template?.views.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm space-y-1">
            <span className="text-muted-foreground">Color prenda</span>
            <div className="flex gap-2">
              <input
                type="color"
                value={garmentColor}
                onChange={(e) => setGarmentColor(e.target.value.toUpperCase())}
                className="h-10 w-12 rounded-lg border border-border cursor-pointer"
              />
              <input
                type="text"
                value={garmentColor}
                onChange={(e) => setGarmentColor(e.target.value)}
                className="flex-1 rounded-xl border border-border px-3 py-2 text-sm font-mono"
              />
            </div>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {template?.views.some((v) => v.id === "back") && (
            <button
              type="button"
              onClick={duplicateToBack}
              disabled={currentPlacements.length === 0}
              className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-background disabled:opacity-50"
            >
              Copiar vista → Espalda
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="bg-card rounded-2xl p-4 boty-shadow space-y-3">
          <p className="text-sm font-medium">Mis diseños</p>
          <p className="text-xs text-muted-foreground">Arrastra al mockup →</p>
          {designs.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sube diseños en la pestaña Diseños.</p>
          ) : (
            <ul className="space-y-2 max-h-[420px] overflow-y-auto">
              {designs.map((d) => (
                <li
                  key={d.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/design-id", d.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  className="flex items-center gap-2 p-2 rounded-xl border border-border cursor-grab active:cursor-grabbing hover:bg-background/80"
                >
                  {d.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.thumbnailUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                  )}
                  <span className="text-xs truncate">{d.name}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="space-y-4 min-w-0 flex-1">
          {view && (
            <div
              className="relative mx-auto w-full max-w-2xl rounded-2xl overflow-hidden boty-shadow border border-border/60"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div
                className="relative w-full bg-muted/40"
                style={{ aspectRatio: canvasAspect }}
              >
                <div className="absolute inset-0 overflow-hidden">
                  <MockupCanvas view={view} garmentColor={garmentColor} />

                  {cropPrintArea && (
                    <div
                      className="absolute border-2 border-dashed border-primary/50 bg-primary/5 rounded-sm"
                      style={{
                        left: `${cropPrintArea.x * 100}%`,
                        top: `${cropPrintArea.y * 100}%`,
                        width: `${cropPrintArea.width * 100}%`,
                        height: `${cropPrintArea.height * 100}%`,
                      }}
                    >
                  {currentPlacements.map((p) => {
                    const design = designMap.get(p.designId);
                    if (!design) return null;
                    return (
                      <button
                        key={p.localId}
                        type="button"
                        onClick={() => setSelectedId(p.localId)}
                        className={cn(
                          "absolute cursor-move overflow-hidden rounded",
                          selectedId === p.localId && "ring-2 ring-primary ring-offset-1",
                        )}
                        style={{
                          left: `${p.x * 100}%`,
                          top: `${p.y * 100}%`,
                          width: `${p.width * 100}%`,
                          transform: `rotate(${p.rotation}deg)`,
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedId(p.localId);
                          const startX = e.clientX;
                          const startY = e.clientY;
                          const origX = p.x;
                          const origY = p.y;
                          const el = e.currentTarget.parentElement;
                          if (!el) return;

                          function onMove(ev: MouseEvent) {
                            const rect = el!.getBoundingClientRect();
                            const dx = (ev.clientX - startX) / rect.width;
                            const dy = (ev.clientY - startY) / rect.height;
                            updatePlacement(p.localId, {
                              x: Math.min(1 - p.width, Math.max(0, origX + dx)),
                              y: Math.min(1 - 0.05, Math.max(0, origY + dy)),
                            });
                          }
                          function onUp() {
                            window.removeEventListener("mousemove", onMove);
                            window.removeEventListener("mouseup", onUp);
                          }
                          window.addEventListener("mousemove", onMove);
                          window.addEventListener("mouseup", onUp);
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={design.fileUrl}
                          alt={design.name}
                          className="w-full h-auto pointer-events-none"
                          draggable={false}
                        />
                      </button>
                    );
                  })}
                  {currentPlacements.length === 0 && (
                    <p className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground text-center px-2">
                      Suelta un diseño aquí
                    </p>
                  )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {selected && (
            <div className="bg-card rounded-2xl p-4 boty-shadow flex flex-wrap gap-4 items-end text-sm">
              <label className="space-y-1 flex-1 min-w-[120px]">
                <span className="text-xs text-muted-foreground">Escala</span>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.02"
                  value={selected.width}
                  onChange={(e) =>
                    updatePlacement(selected.localId, { width: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
              </label>
              <label className="space-y-1 flex-1 min-w-[120px]">
                <span className="text-xs text-muted-foreground">Rotación</span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={selected.rotation}
                  onChange={(e) =>
                    updatePlacement(selected.localId, { rotation: parseInt(e.target.value, 10) })
                  }
                  className="w-full"
                />
              </label>
              <button
                type="button"
                onClick={() => updatePlacement(selected.localId, centerPlacement(selected))}
                className="text-xs text-primary hover:underline px-2 py-1"
              >
                Centrar
              </button>
              <button
                type="button"
                onClick={() => removePlacement(selected.localId)}
                className="text-xs text-destructive hover:underline px-2 py-1"
              >
                Quitar diseño
              </button>
            </div>
          )}
        </div>
      </div>

      {(!prototypeMode || isEditing) && (
      <div className="bg-card rounded-2xl p-5 boty-shadow space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            required={!prototypeMode}
            placeholder="Nombre del producto"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="rounded-xl border border-border px-3 py-2 text-sm"
          />
          {!isEditing && (
            <input
              placeholder="SKU base (opcional)"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="rounded-xl border border-border px-3 py-2 text-sm"
            />
          )}
          {!isEditing && (
            <input
              placeholder="Color (etiqueta)"
              value={colorLabel}
              onChange={(e) => setColorLabel(e.target.value)}
              className="rounded-xl border border-border px-3 py-2 text-sm"
            />
          )}
          <input
            required
            type="number"
            min="1"
            step="0.01"
            placeholder="Precio de venta (MXN)"
            value={priceMxn}
            onChange={(e) => setPriceMxn(e.target.value)}
            className="rounded-xl border border-border px-3 py-2 text-sm"
          />
        </div>

        {!isEditing && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Tallas a crear</p>
            <div className="flex flex-wrap gap-2">
              {SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm border boty-transition",
                    selectedSizes.includes(size)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-background",
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Al guardar se generan archivos de impresión a 300 DPI por cada vista con diseño.
        </p>
      </div>
      )}

      <button
        type="submit"
        disabled={busy || !template}
        className="w-full sm:w-auto px-8 py-3 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
      >
        {busy
          ? "Procesando…"
          : prototypeMode && !isEditing
            ? "Generar archivos para imprenta"
            : isEditing
              ? "Actualizar producto"
              : "Guardar producto"}
      </button>
    </form>
  );
}
