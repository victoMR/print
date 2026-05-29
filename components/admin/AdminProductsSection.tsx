"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  adminCreateProduct,
  adminCreateProductVariant,
  adminGetProduct,
  adminListProducts,
  adminUpdateProduct,
} from "@/lib/api";
import type { AdminProductDetail, AdminProductSummary } from "@/lib/api-types";
import { cn, formatMxn } from "@/lib/utils";

type AdminProductsSectionProps = {
  busy: boolean;
  setBusy: (v: boolean) => void;
  onError: (msg: string | null) => void;
};

export function AdminProductsSection({ busy, setBusy, onError }: AdminProductsSectionProps) {
  const [products, setProducts] = useState<AdminProductSummary[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminProductDetail | null>(null);

  const [productForm, setProductForm] = useState({
    name: "",
    slug: "",
    description: "",
    thumbnailUrl: "",
  });

  const [variantForm, setVariantForm] = useState({
    sku: "",
    sizeLabel: "",
    colorLabel: "",
    retailPriceMxn: "",
    stockQuantity: "0",
  });

  const loadProducts = useCallback(async () => {
    onError(null);
    const res = await adminListProducts();
    setProducts(res.data);
  }, [onError]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  async function loadDetail(productId: string) {
    const res = await adminGetProduct(productId);
    setDetail(res.data);
    setExpandedId(productId);
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    onError(null);
    try {
      await adminCreateProduct({
        name: productForm.name,
        slug: productForm.slug || undefined,
        description: productForm.description || undefined,
        thumbnailUrl: productForm.thumbnailUrl,
      });
      setProductForm({ name: "", slug: "", description: "", thumbnailUrl: "" });
      await loadProducts();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error al crear producto");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateVariant(e: React.FormEvent) {
    e.preventDefault();
    if (!expandedId) return;
    setBusy(true);
    onError(null);
    try {
      await adminCreateProductVariant(expandedId, {
        sku: variantForm.sku,
        sizeLabel: variantForm.sizeLabel,
        colorLabel: variantForm.colorLabel,
        retailPriceMxn: Number.parseFloat(variantForm.retailPriceMxn),
        stockQuantity: Number.parseInt(variantForm.stockQuantity, 10) || 0,
      });
      setVariantForm({ sku: "", sizeLabel: "", colorLabel: "", retailPriceMxn: "", stockQuantity: "0" });
      await loadDetail(expandedId);
      await loadProducts();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error al crear variante");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(product: AdminProductSummary) {
    setBusy(true);
    onError(null);
    try {
      const next = product.status === "active" ? "inactive" : "active";
      await adminUpdateProduct(product.id, { status: next });
      await loadProducts();
      if (expandedId === product.id) await loadDetail(product.id);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error al actualizar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[340px_1fr]">
      <form
        onSubmit={(e) => void handleCreateProduct(e)}
        className="bg-card rounded-2xl p-5 boty-shadow space-y-3 h-fit"
      >
        <h2 className="font-serif text-lg">Nuevo producto</h2>
        <input
          required
          placeholder="Nombre"
          value={productForm.name}
          onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
          className="w-full rounded-xl border border-border px-3 py-2 text-sm"
        />
        <input
          placeholder="Slug (opcional, ej. camiseta-clasica)"
          value={productForm.slug}
          onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })}
          className="w-full rounded-xl border border-border px-3 py-2 text-sm"
        />
        <input
          required
          type="url"
          placeholder="URL miniatura"
          value={productForm.thumbnailUrl}
          onChange={(e) => setProductForm({ ...productForm, thumbnailUrl: e.target.value })}
          className="w-full rounded-xl border border-border px-3 py-2 text-sm"
        />
        <textarea
          placeholder="Descripción"
          value={productForm.description}
          onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
          className="w-full rounded-xl border border-border px-3 py-2 text-sm min-h-[72px]"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-primary text-primary-foreground py-2.5 rounded-full text-sm font-medium disabled:opacity-60"
        >
          Crear producto
        </button>
      </form>

      <div className="space-y-4">
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay productos en el catálogo.</p>
        ) : (
          products.map((p) => (
            <article
              key={p.id}
              className="bg-card rounded-2xl p-5 boty-shadow border border-border/60"
            >
              <div className="flex gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.thumbnailUrl}
                  alt=""
                  className="w-20 h-20 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{p.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">/{p.slug}</p>
                    </div>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        p.status === "active"
                          ? "bg-green-500/10 text-green-700"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {p.status === "active" ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {p.description || "Sin descripción"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {p.variantCount} variante{p.variantCount !== 1 ? "s" : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void (expandedId === p.id ? setExpandedId(null) : loadDetail(p.id))}
                      className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-background"
                    >
                      {expandedId === p.id ? "Ocultar variantes" : "Ver variantes"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleStatus(p)}
                      className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-background"
                    >
                      {p.status === "active" ? "Desactivar" : "Activar"}
                    </button>
                    <Link
                      href={`/product/${p.slug}`}
                      target="_blank"
                      className="text-xs px-3 py-1.5 rounded-full text-primary hover:underline"
                    >
                      Ver en tienda
                    </Link>
                  </div>
                </div>
              </div>

              {expandedId === p.id && detail?.id === p.id && (
                <div className="mt-5 pt-5 border-t border-border/60 space-y-4">
                  {detail.variants.length > 0 && (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-muted-foreground border-b border-border">
                          <th className="pb-2 pr-2">SKU</th>
                          <th className="pb-2 pr-2">Talla</th>
                          <th className="pb-2 pr-2">Color</th>
                          <th className="pb-2 pr-2">Precio</th>
                          <th className="pb-2">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.variants.map((v) => (
                          <tr key={v.id} className="border-b border-border/40">
                            <td className="py-2 pr-2 font-mono">{v.sku}</td>
                            <td className="py-2 pr-2">{v.size}</td>
                            <td className="py-2 pr-2">{v.color}</td>
                            <td className="py-2 pr-2">{formatMxn(v.retailPriceMxn)}</td>
                            <td className="py-2">{v.stockQuantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  <form
                    onSubmit={(e) => void handleCreateVariant(e)}
                    className="grid sm:grid-cols-2 gap-2 pt-2"
                  >
                    <p className="sm:col-span-2 text-sm font-medium">Agregar variante</p>
                    <input
                      required
                      placeholder="SKU"
                      value={variantForm.sku}
                      onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                      className="rounded-lg border border-border px-2 py-1.5 text-sm"
                    />
                    <input
                      required
                      placeholder="Talla (M, L…)"
                      value={variantForm.sizeLabel}
                      onChange={(e) => setVariantForm({ ...variantForm, sizeLabel: e.target.value })}
                      className="rounded-lg border border-border px-2 py-1.5 text-sm"
                    />
                    <input
                      required
                      placeholder="Color"
                      value={variantForm.colorLabel}
                      onChange={(e) => setVariantForm({ ...variantForm, colorLabel: e.target.value })}
                      className="rounded-lg border border-border px-2 py-1.5 text-sm"
                    />
                    <input
                      required
                      placeholder="Precio MXN"
                      type="number"
                      step="0.01"
                      min="0"
                      value={variantForm.retailPriceMxn}
                      onChange={(e) => setVariantForm({ ...variantForm, retailPriceMxn: e.target.value })}
                      className="rounded-lg border border-border px-2 py-1.5 text-sm"
                    />
                    <input
                      placeholder="Stock inicial"
                      type="number"
                      min="0"
                      value={variantForm.stockQuantity}
                      onChange={(e) => setVariantForm({ ...variantForm, stockQuantity: e.target.value })}
                      className="rounded-lg border border-border px-2 py-1.5 text-sm sm:col-span-2"
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="sm:col-span-2 bg-primary text-primary-foreground py-2 rounded-full text-sm disabled:opacity-60"
                    >
                      Agregar variante
                    </button>
                  </form>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
