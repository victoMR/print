"use client";

import { GlassButton } from "@/components/ui/GlassButton";
import { CatalogBrowser } from "@/components/admin/CatalogBrowser";
import { SyncProductEditModal } from "@/components/admin/SyncProductEditModal";
import { SyncProductForm } from "@/components/admin/SyncProductForm";
import { SyncProductList } from "@/components/admin/SyncProductList";
import {
  adminCreateSyncProduct,
  adminDeleteSyncProduct,
  adminGetCatalogProduct,
  adminListCatalog,
  adminListSyncProducts,
  adminSyncCatalog,
} from "@/lib/api";
import type { PrintfulCatalogProduct, PrintfulSyncProduct } from "@/lib/api-types";
import { useCallback, useEffect, useState } from "react";

/** Admin MVP sin auth — ver .cursorrules antes de producción. */
export function AdminPanel() {
  const [syncProducts, setSyncProducts] = useState<PrintfulSyncProduct[]>([]);
  const [catalog, setCatalog] = useState<PrintfulCatalogProduct[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState<PrintfulCatalogProduct | null>(null);
  const [defaultVariantId, setDefaultVariantId] = useState<number | undefined>();
  const [loadingSync, setLoadingSync] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [crudBusy, setCrudBusy] = useState(false);

  const loadSync = useCallback(async () => {
    setLoadingSync(true);
    try {
      const res = await adminListSyncProducts();
      setSyncProducts(res.data);
    } catch {
      setSyncProducts([]);
    } finally {
      setLoadingSync(false);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const res = await adminListCatalog();
      setCatalog(Array.isArray(res.data) ? res.data : []);
    } catch {
      setCatalog([]);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    void loadSync();
    void loadCatalog();
  }, [loadSync, loadCatalog]);

  async function handleSelectCatalog(product: PrintfulCatalogProduct) {
    setSelectedCatalog(product);
    try {
      const res = await adminGetCatalogProduct(product.id);
      const result = res.data as { product?: { variants?: Array<{ id: number }> } };
      const firstVariant = result?.product?.variants?.[0]?.id;
      setDefaultVariantId(firstVariant);
    } catch {
      setDefaultVariantId(undefined);
    }
  }

  async function handleSyncCatalog() {
    setSyncMsg(null);
    try {
      await adminSyncCatalog();
      setSyncMsg("Catálogo sincronizado a Supabase.");
      await loadSync();
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : "Error al sincronizar");
    }
  }

  async function handleDeleteSyncProduct(id: number) {
    const ok = window.confirm(
      "¿Eliminar este producto sync en Printful y las filas en Supabase? No se puede deshacer.",
    );
    if (!ok) return;
    setCrudBusy(true);
    setSyncMsg(null);
    try {
      await adminDeleteSyncProduct(id);
      setSyncMsg("Producto eliminado.");
      await loadSync();
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setCrudBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 md:px-6 flex flex-col gap-8">
      {editId !== null && (
        <SyncProductEditModal
          syncProductId={editId}
          onClose={() => setEditId(null)}
          onSaved={() => void loadSync()}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Printful</h1>
          <p className="text-sm text-foreground/60 mt-1">
            CRUD MVP sin auth — solo uso interno en desarrollo
          </p>
        </div>
        <GlassButton variant="ghost" onClick={() => void handleSyncCatalog()}>
          Sync catálogo → DB
        </GlassButton>
      </div>
      {syncMsg && <p className="text-sm text-indigo-400">{syncMsg}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <SyncProductList
          products={syncProducts}
          loading={loadingSync}
          busy={crudBusy}
          onEdit={(id) => setEditId(id)}
          onDelete={(id) => void handleDeleteSyncProduct(id)}
        />
        <CatalogBrowser
          products={catalog}
          loading={loadingCatalog}
          onSelect={(p) => void handleSelectCatalog(p)}
          selectedId={selectedCatalog?.id ?? null}
        />
      </div>

      <SyncProductForm
        defaultVariantId={defaultVariantId}
        onSubmit={async (payload) => {
          await adminCreateSyncProduct(payload);
          await loadSync();
        }}
      />
    </div>
  );
}
