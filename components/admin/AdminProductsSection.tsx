"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminGetProduct, adminListProducts, adminUpdateProduct } from "@/lib/api";
import type { AdminProductDetail, AdminProductSummary } from "@/lib/api-types";
import { CreateProductModal, EditProductModal } from "@/components/admin/admin-product-modals";
import { cn, formatMxn } from "@/lib/utils";
import { BotyButton, BotyPageHeader } from "@/components/boty/ui-patterns";
import { ExternalLink, Pencil, Plus, PowerOff, Power } from "lucide-react";

type AdminProductsSectionProps = {
  busy: boolean;
  setBusy: (v: boolean) => void;
  onError: (msg: string | null) => void;
};

export function AdminProductsSection({ busy, setBusy, onError }: AdminProductsSectionProps) {
  const [products, setProducts] = useState<AdminProductSummary[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editProduct, setEditProduct] = useState<AdminProductDetail | null>(null);

  const loadProducts = useCallback(async () => {
    onError(null);
    const res = await adminListProducts();
    setProducts(res.data);
  }, [onError]);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  async function openEdit(productId: string) {
    setBusy(true);
    try {
      const res = await adminGetProduct(productId);
      setEditProduct(res.data);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error al cargar el producto");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(p: AdminProductSummary) {
    setBusy(true);
    onError(null);
    try {
      await adminUpdateProduct(p.id, { status: p.status === "active" ? "inactive" : "active" });
      await loadProducts();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error al actualizar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <BotyPageHeader
        title="Productos"
        description="Catálogo de la tienda. Para mockups y prototipos de impresión usa la pestaña Prototipos."
        action={
          <BotyButton
            type="button"
            variant="primary"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo producto
          </BotyButton>
        }
      />

      {products.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">
          <p>No hay productos todavía.</p>
          <BotyButton
            type="button"
            variant="secondary"
            className="mt-4"
            onClick={() => setShowCreate(true)}
          >
            Crear el primero
          </BotyButton>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              busy={busy}
              onEdit={() => void openEdit(p.id)}
              onToggleStatus={() => void toggleStatus(p)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <CreateProductModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          void loadProducts();
          setShowCreate(false);
        }}
      />

      {/* Edit modal */}
      <EditProductModal
        open={editProduct !== null}
        product={editProduct}
        onClose={() => setEditProduct(null)}
        onSaved={() => {
          void loadProducts();
          // No recargar editProduct desde servidor aquí:
          // el variants editor maneja su propio estado y solo notifica via onChanged.
          // Recargar el objeto completo causaría un bucle (product prop cambia →
          // useEffect en EditProductModal → re-render editor → reload de nuevo).
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Product card
// ---------------------------------------------------------------------------

function ProductCard({
  product,
  busy,
  onEdit,
  onToggleStatus,
}: {
  product: AdminProductSummary;
  busy: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
}) {
  const isActive = product.status === "active";

  return (
    <article
      className={cn(
        "group relative rounded-3xl border bg-card overflow-hidden flex flex-col boty-shadow boty-transition",
        !isActive && "opacity-60",
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.thumbnailUrl}
          alt={product.name}
          className="w-full h-full object-cover boty-transition group-hover:scale-105"
        />
        {/* Status badge */}
        <span
          className={cn(
            "absolute top-3 right-3 text-xs font-medium px-2.5 py-1 rounded-full",
            isActive
              ? "bg-emerald-500/20 text-emerald-800 backdrop-blur-sm"
              : "bg-black/40 text-white backdrop-blur-sm",
          )}
        >
          {isActive ? "Activo" : "Inactivo"}
        </span>
        {/* Variant count */}
        <span className="absolute bottom-3 left-3 text-xs bg-black/40 text-white backdrop-blur-sm px-2.5 py-1 rounded-full">
          {product.variantCount} variante{product.variantCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div>
          <h3 className="font-semibold leading-snug line-clamp-1">{product.name}</h3>
          <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">/{product.slug}</p>
          {product.description ? (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{product.description}</p>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-auto">
          <BotyButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={onEdit}
            className="flex-1"
          >
            <Pencil className="w-3.5 h-3.5 mr-1" />
            Editar
          </BotyButton>
          <BotyButton
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={onToggleStatus}
            title={isActive ? "Ocultar del catálogo" : "Publicar en catálogo"}
          >
            {isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5 text-emerald-600" />}
          </BotyButton>
          <Link
            href={`/product/${product.slug}`}
            target="_blank"
            className={cn(
              "inline-flex items-center justify-center px-4 py-2 text-xs rounded-full boty-transition text-muted-foreground hover:text-foreground hover:bg-muted/60",
            )}
            title="Ver en tienda"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
