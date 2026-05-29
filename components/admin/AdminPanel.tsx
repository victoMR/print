"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminCreateDesign,
  adminDeleteDesign,
  adminListDesigns,
  adminListInventory,
  adminListOrders,
  adminUpdateInventory,
  adminUpdateOrderStatus,
} from "@/lib/api";
import type {
  AdminDesign,
  AdminInventoryRow,
  AdminOrderSummary,
  MrpapsOrderStatus,
} from "@/lib/api-types";
import { ORDER_STATUS_LABELS } from "@/lib/api-types";
import { cn, formatMxn } from "@/lib/utils";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminProductsSection } from "@/components/admin/AdminProductsSection";
import { adminFetchMe } from "@/lib/api";
import { clearAdminToken, type AdminSessionUser } from "@/lib/admin-session";

type Tab = "orders" | "products" | "inventory" | "designs";

const STATUS_FLOW: MrpapsOrderStatus[] = ["pedido", "impreso", "enviado", "cancelado"];

export function AdminPanel() {
  const [user, setUser] = useState<AdminSessionUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState<Tab>("orders");
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [inventory, setInventory] = useState<AdminInventoryRow[]>([]);
  const [designs, setDesigns] = useState<AdminDesign[]>([]);
  const [filterStatus, setFilterStatus] = useState<MrpapsOrderStatus | "">("");
  const [busy, setBusy] = useState(false);

  const [designForm, setDesignForm] = useState({
    name: "",
    fileUrl: "",
    description: "",
  });

  const load = useCallback(async () => {
    setError(null);
    try {
      if (tab === "orders") {
        const res = await adminListOrders(filterStatus || undefined);
        setOrders(res.data);
      } else if (tab === "inventory") {
        const res = await adminListInventory();
        setInventory(res.data);
      } else {
        const res = await adminListDesigns();
        setDesigns(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    }
  }, [tab, filterStatus]);

  useEffect(() => {
    void adminFetchMe()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [load, user]);

  if (!authChecked) {
    return <p className="text-center py-16 text-muted-foreground text-sm">Verificando sesión…</p>;
  }

  if (!user) {
    return <AdminLogin onSuccess={setUser} />;
  }

  function handleLogout() {
    clearAdminToken();
    setUser(null);
  }

  async function handleStatusChange(publicId: string, status: MrpapsOrderStatus) {
    setBusy(true);
    setError(null);
    try {
      let trackingNumber: string | null | undefined;
      let trackingUrl: string | null | undefined;
      let carrier: string | null | undefined;

      if (status === "enviado") {
        trackingNumber = window.prompt("Número de guía") ?? null;
        trackingUrl = window.prompt("URL de rastreo (opcional)") ?? null;
        carrier = window.prompt("Paquetería (opcional)") ?? null;
      }

      await adminUpdateOrderStatus(publicId, {
        status,
        trackingNumber,
        trackingUrl,
        carrier,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar");
    } finally {
      setBusy(false);
    }
  }

  async function handleStockSave(variantId: string, value: string) {
    const stockQuantity = Number.parseInt(value, 10);
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) return;
    setBusy(true);
    try {
      await adminUpdateInventory(variantId, stockQuantity);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar stock");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateDesign(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminCreateDesign({
        name: designForm.name,
        fileUrl: designForm.fileUrl,
        description: designForm.description || undefined,
      });
      setDesignForm({ name: "", fileUrl: "", description: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear diseño");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Admin Mr. Paps</h1>
          <p className="text-sm text-muted-foreground mt-1">Sesión: {user.email}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cerrar sesión
        </button>
      </header>

      <nav className="flex flex-wrap gap-2 mb-6">
        {(
          [
            ["orders", "Pedidos"],
            ["products", "Productos"],
            ["inventory", "Inventario"],
            ["designs", "Diseños"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm boty-transition",
              tab === id
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border hover:bg-card/80",
            )}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void load()}
          disabled={busy}
          className="ml-auto text-sm text-primary hover:underline disabled:opacity-50"
        >
          Actualizar
        </button>
      </nav>

      {error && (
        <p className="mb-4 text-sm text-destructive bg-destructive/10 rounded-xl p-3">{error}</p>
      )}

      {tab === "orders" && (
        <section className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <span>Filtrar estado</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as MrpapsOrderStatus | "")}
              className="rounded-lg border border-border px-2 py-1 bg-background"
            >
              <option value="">Todos</option>
              {STATUS_FLOW.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>

          {orders.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay pedidos.</p>
          ) : (
            <ul className="space-y-4">
              {orders.map((order) => (
                <li key={order.publicId} className="bg-card rounded-2xl p-5 boty-shadow border border-border/60">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="font-semibold">{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.customerName} · {order.customerEmail}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(order.orderedAt).toLocaleString("es-MX")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatMxn(order.totalMxn)}</p>
                      <p className="text-sm">{ORDER_STATUS_LABELS[order.status]}</p>
                    </div>
                  </div>
                  <ul className="mt-3 text-xs text-muted-foreground space-y-1">
                    {order.items.map((item, i) => (
                      <li key={i}>
                        {item.quantity}× {item.productName} ({item.variantLabel}) —{" "}
                        {formatMxn(item.unitPriceMxn)}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {STATUS_FLOW.filter((s) => s !== order.status).map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={busy}
                        onClick={() => void handleStatusChange(order.publicId, s)}
                        className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-background boty-transition disabled:opacity-50"
                      >
                        → {ORDER_STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                  {order.trackingUrl && (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-xs text-primary underline"
                    >
                      Ver rastreo
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "products" && (
        <AdminProductsSection busy={busy} setBusy={setBusy} onError={setError} />
      )}

      {tab === "inventory" && (
        <section className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-border">
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Producto</th>
                <th className="py-2 pr-4">Variante</th>
                <th className="py-2 pr-4">Precio</th>
                <th className="py-2 pr-4">Stock</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((row) => (
                <tr
                  key={row.variantId}
                  className={cn(
                    "border-b border-border/50",
                    row.isLowStock && "bg-amber-500/5",
                  )}
                >
                  <td className="py-3 pr-4 font-mono text-xs">{row.sku}</td>
                  <td className="py-3 pr-4">{row.productName}</td>
                  <td className="py-3 pr-4">
                    {row.color} / {row.size}
                  </td>
                  <td className="py-3 pr-4">{formatMxn(row.retailPriceMxn)}</td>
                  <td className="py-3 pr-4">
                    <StockEditor
                      defaultValue={row.stockQuantity}
                      disabled={busy}
                      onSave={(v) => void handleStockSave(row.variantId, v)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === "designs" && (
        <section className="grid gap-8 lg:grid-cols-2">
          <form onSubmit={(e) => void handleCreateDesign(e)} className="bg-card rounded-2xl p-5 boty-shadow space-y-3">
            <h2 className="font-serif text-lg">Nuevo diseño</h2>
            <input
              required
              placeholder="Nombre"
              value={designForm.name}
              onChange={(e) => setDesignForm({ ...designForm, name: e.target.value })}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
            <input
              required
              type="url"
              placeholder="URL del archivo (PNG/JPG)"
              value={designForm.fileUrl}
              onChange={(e) => setDesignForm({ ...designForm, fileUrl: e.target.value })}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Descripción (opcional)"
              value={designForm.description}
              onChange={(e) => setDesignForm({ ...designForm, description: e.target.value })}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm min-h-[80px]"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-full text-sm font-medium disabled:opacity-60"
            >
              Guardar diseño
            </button>
          </form>

          <ul className="space-y-3">
            {designs.map((d) => (
              <li key={d.id} className="bg-card rounded-2xl p-4 boty-shadow flex gap-4">
                {d.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.thumbnailUrl} alt="" className="w-16 h-16 rounded-lg object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{d.fileUrl}</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void adminDeleteDesign(d.id).then(load)}
                  className="text-xs text-destructive hover:underline shrink-0"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StockEditor({
  defaultValue,
  disabled,
  onSave,
}: {
  defaultValue: number;
  disabled: boolean;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(String(defaultValue));

  useEffect(() => {
    setValue(String(defaultValue));
  }, [defaultValue]);

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-16 rounded-lg border border-border px-2 py-1 text-xs"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSave(value)}
        className="text-xs text-primary hover:underline disabled:opacity-50"
      >
        OK
      </button>
    </div>
  );
}
