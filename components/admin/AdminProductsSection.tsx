"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminGetProduct, adminListProducts, adminUpdateProduct } from "@/lib/api";
import type { AdminProductDetail, AdminProductSummary } from "@/lib/api-types";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type ProductCategory,
} from "@/lib/product-categories";
import { CreateProductModal, EditProductModal } from "@/components/admin/admin-product-modals";
import { AdminSelect } from "@/components/admin/admin-select";
import { AdminViewToggle, useAdminViewMode } from "@/components/admin/admin-view-toggle";
import { cn, formatMxn } from "@/lib/utils";
import { BotyButton, BotyLabel, BotyPageHeader, BotySurface } from "@/components/boty/ui-patterns";
import { ExternalLink, Pencil, Plus, Power, PowerOff, Search, X } from "lucide-react";

type AdminProductsSectionProps = {
  busy: boolean;
  setBusy: (v: boolean) => void;
  onError: (msg: string | null) => void;
};

type StatusFilter = "" | "active" | "inactive";

export function AdminProductsSection({ busy, setBusy, onError }: AdminProductsSectionProps) {
  const [products, setProducts] = useState<AdminProductSummary[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editProduct, setEditProduct] = useState<AdminProductDetail | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<ProductCategory | "">("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("");
  const [viewMode, setViewMode] = useAdminViewMode("admin-products-view", "grid");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  const loadProducts = useCallback(async () => {
    onError(null);
    const res = await adminListProducts();
    setProducts(res.data);
  }, [onError]);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (filterCategory && p.category !== filterCategory) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, searchQuery, filterCategory, filterStatus]);

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
        description="Catálogo de la tienda. Edita desde el panel lateral."
        action={
          <BotyButton type="button" variant="primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo producto
          </BotyButton>
        }
      />

      <BotySurface className="p-4 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-0 w-full sm:w-auto sm:min-w-[220px] sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre o slug…"
            className="w-full rounded-xl border border-border bg-background pl-9 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 boty-transition placeholder:text-muted-foreground/60"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground boty-transition"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <BotyLabel className="shrink-0 hidden sm:inline">Categoría</BotyLabel>
          <AdminSelect
            value={filterCategory || "__all__"}
            onValueChange={(v) => setFilterCategory(v === "__all__" ? "" : (v as ProductCategory))}
            className="w-[150px]"
            placeholder="Todas"
            options={[
              { value: "__all__", label: "Todas" },
              ...PRODUCT_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
            ]}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <BotyLabel className="shrink-0 hidden sm:inline">Estado</BotyLabel>
          <AdminSelect
            value={filterStatus || "__all__"}
            onValueChange={(v) => setFilterStatus(v === "__all__" ? "" : (v as StatusFilter))}
            className="w-[130px]"
            placeholder="Todos"
            options={[
              { value: "__all__", label: "Todos" },
              { value: "active", label: "Activos" },
              { value: "inactive", label: "Inactivos" },
            ]}
          />
        </div>

        <div className="flex items-center gap-3 sm:ml-auto">
          <AdminViewToggle value={viewMode} onChange={setViewMode} />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {filteredProducts.length} de {products.length}
          </span>
        </div>
      </BotySurface>

      {products.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">
          <p>No hay productos todavía.</p>
          <BotyButton type="button" variant="secondary" className="mt-4" onClick={() => setShowCreate(true)}>
            Crear el primero
          </BotyButton>
        </div>
      ) : filteredProducts.length === 0 ? (
        <BotySurface className="p-12 text-center text-muted-foreground text-sm">
          No hay productos con estos filtros.
        </BotySurface>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filteredProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              busy={busy}
              onEdit={() => void openEdit(p.id)}
              onToggleStatus={() => void toggleStatus(p)}
            />
          ))}
        </div>
      ) : (
        <BotySurface className="overflow-hidden divide-y divide-border/50">
          {filteredProducts.map((p) => (
            <ProductListRow
              key={p.id}
              product={p}
              busy={busy}
              onEdit={() => void openEdit(p.id)}
              onToggleStatus={() => void toggleStatus(p)}
            />
          ))}
        </BotySurface>
      )}

      <CreateProductModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          void loadProducts();
          setShowCreate(false);
        }}
      />

      <EditProductModal
        open={editProduct !== null}
        product={editProduct}
        onClose={() => setEditProduct(null)}
        onSaved={() => { void loadProducts(); }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Grid card
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
      <div className="relative aspect-square bg-muted overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.thumbnailUrl}
          alt={product.name}
          className="w-full h-full object-cover boty-transition group-hover:scale-105"
        />
        <span className="absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full bg-black/40 text-white backdrop-blur-sm">
          {PRODUCT_CATEGORY_LABELS[product.category ?? "camiseta"] ?? product.category}
        </span>
        <span
          className={cn(
            "absolute top-3 right-3 text-xs font-medium px-2.5 py-1 rounded-full",
            isActive ? "bg-emerald-500/20 text-emerald-800 backdrop-blur-sm" : "bg-black/40 text-white backdrop-blur-sm",
          )}
        >
          {isActive ? "Activo" : "Inactivo"}
        </span>
        <span className="absolute bottom-3 left-3 text-xs bg-black/40 text-white backdrop-blur-sm px-2.5 py-1 rounded-full">
          {product.variantCount} variante{product.variantCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        <div>
          <h3 className="font-semibold leading-snug line-clamp-1">{product.name}</h3>
          <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">/{product.slug}</p>
          {product.description ? (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{product.description}</p>
          ) : null}
        </div>
        <ProductActions product={product} busy={busy} onEdit={onEdit} onToggleStatus={onToggleStatus} className="mt-auto" />
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// List row
// ---------------------------------------------------------------------------

function ProductListRow({
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
    <div
      className={cn(
        "flex items-center gap-3 sm:gap-4 px-4 py-3 hover:bg-muted/30 boty-transition",
        !isActive && "opacity-70",
      )}
    >
      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-muted shrink-0 ring-1 ring-border/60">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.thumbnailUrl} alt="" className="w-full h-full object-cover" />
      </div>

      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] sm:items-center gap-1 sm:gap-4">
        <div className="min-w-0">
          <p className="font-medium truncate">{product.name}</p>
          <p className="text-xs text-muted-foreground font-mono truncate">/{product.slug}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {PRODUCT_CATEGORY_LABELS[product.category ?? "camiseta"]}
          </span>
          <span className={cn("px-2 py-0.5 rounded-full", isActive ? "bg-emerald-500/15 text-emerald-800" : "bg-muted text-muted-foreground")}>
            {isActive ? "Activo" : "Inactivo"}
          </span>
          <span className="text-muted-foreground hidden md:inline">
            {product.variantCount} var.
          </span>
        </div>
        <ProductActions product={product} busy={busy} onEdit={onEdit} onToggleStatus={onToggleStatus} compact />
      </div>
    </div>
  );
}

function ProductActions({
  product,
  busy,
  onEdit,
  onToggleStatus,
  compact,
  className,
}: {
  product: AdminProductSummary;
  busy: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
  compact?: boolean;
  className?: string;
}) {
  const isActive = product.status === "active";

  return (
    <div className={cn("flex flex-wrap gap-2", compact ? "justify-end" : "", className)}>
      <BotyButton
        type="button"
        variant="secondary"
        size="sm"
        disabled={busy}
        onClick={onEdit}
        className={compact ? "" : "flex-1"}
      >
        <Pencil className="w-3.5 h-3.5 mr-1" />
        {compact ? <span className="sr-only sm:not-sr-only">Editar</span> : "Editar"}
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
        className="inline-flex items-center justify-center px-3 py-2 text-xs rounded-full boty-transition text-muted-foreground hover:text-foreground hover:bg-muted/60"
        title="Ver en tienda"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
