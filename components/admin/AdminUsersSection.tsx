"use client";

import { useEffect, useState, useCallback } from "react";
import {
  adminListUsers,
  adminCreateUser,
  adminUpdateUserRole,
  adminDeleteUser,
  type AdminUserRow,
} from "@/lib/api";
import { Loader2, Plus, Trash2, RefreshCw, ShieldCheck, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";

type RoleFilter = "all" | "customer" | "admin" | "dev";

const ROLE_LABELS: Record<AdminUserRow["role"], string> = {
  customer: "Cliente",
  admin: "Admin",
  dev: "Dev",
};

const ROLE_COLORS: Record<AdminUserRow["role"], string> = {
  customer: "bg-muted text-muted-foreground",
  admin: "bg-blue-100 text-blue-700",
  dev: "bg-primary/10 text-primary",
};

const ROLE_OPTIONS: AdminUserRow["role"][] = ["customer", "admin", "dev"];

// ─── Formulario crear usuario ─────────────────────────────────────────────────

type CreateForm = {
  email: string;
  fullName: string;
  password: string;
  role: "admin" | "dev";
};

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (user: AdminUserRow) => void;
}) {
  const [form, setForm] = useState<CreateForm>({
    email: "",
    fullName: "",
    password: "",
    role: "admin",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await adminCreateUser(form);
      onCreated(res.data);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear usuario");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card rounded-3xl shadow-xl border border-border/60 p-6">
        <h2 className="font-serif text-xl mb-5">Nuevo usuario privilegiado</h2>

        {error && (
          <p className="mb-4 text-sm text-destructive bg-destructive/10 rounded-2xl px-4 py-3 border border-destructive/20">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="admin@mrpaps.mx"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Nombre completo
            </label>
            <input
              type="text"
              required
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="María García"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Contraseña (mín. 8 caracteres)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Rol
            </label>
            <div className="flex gap-2">
              {(["admin", "dev"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, role: r }))}
                  className={cn(
                    "flex-1 px-4 py-2.5 rounded-2xl text-sm font-medium border boty-transition",
                    form.role === r
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  {r === "dev" ? "Dev (superadmin)" : "Admin"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 px-4 py-2.5 rounded-2xl text-sm border border-border hover:bg-muted/50 boty-transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm bg-primary text-primary-foreground hover:bg-primary/90 boty-transition disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Crear usuario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Panel principal ──────────────────────────────────────────────────────────

export function AdminUsersSection() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListUsers({
        search: search.trim() || undefined,
        role: roleFilter !== "all" ? roleFilter : undefined,
        limit: 100,
        offset: 0,
      });
      setUsers(res.data);
      setTotal(res.meta.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRoleChange(userId: string, newRole: AdminUserRow["role"]) {
    setActionBusy(userId);
    try {
      const res = await adminUpdateUserRole(userId, newRole);
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.data : u)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cambiar rol");
    } finally {
      setActionBusy(null);
    }
  }

  async function handleDelete(userId: string, email: string) {
    if (!confirm(`¿Eliminar al usuario ${email}? Esta acción no se puede deshacer.`)) return;
    setActionBusy(userId);
    try {
      await adminDeleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setTotal((t) => t - 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al eliminar usuario");
    } finally {
      setActionBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {total} usuario{total !== 1 ? "s" : ""} en total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-border/80 hover:bg-background disabled:opacity-50 boty-transition"
            aria-label="Actualizar"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm bg-primary text-primary-foreground hover:bg-primary/90 boty-transition"
          >
            <Plus className="w-4 h-4" />
            Nuevo usuario
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por email o nombre…"
          className="flex-1 min-w-[220px] px-4 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "customer", "admin", "dev"] as RoleFilter[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={cn(
                "px-3.5 py-2 rounded-full text-xs font-medium boty-transition",
                roleFilter === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted",
              )}
            >
              {r === "all" ? "Todos" : ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-2xl px-4 py-3 border border-destructive/20">
          {error}
        </p>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Cargando usuarios…
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <UserCog className="w-8 h-8 opacity-40" />
          <p className="text-sm">No se encontraron usuarios</p>
        </div>
      ) : (
        <div className="rounded-3xl border border-border/60 bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground">
                    Usuario
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">
                    Verificado
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground">
                    Rol
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-muted-foreground hidden md:table-cell">
                    Creado
                  </th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className={cn(
                      "group hover:bg-muted/20 boty-transition",
                      actionBusy === u.id && "opacity-50 pointer-events-none",
                    )}
                  >
                    {/* Usuario */}
                    <td className="px-5 py-4">
                      <p className="font-medium truncate max-w-[200px]">{u.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {u.email}
                      </p>
                    </td>

                    {/* Verificado */}
                    <td className="px-5 py-4 hidden sm:table-cell">
                      {u.emailVerifiedAt ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Sí
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Rol */}
                    <td className="px-5 py-4">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          void handleRoleChange(u.id, e.target.value as AdminUserRow["role"])
                        }
                        className={cn(
                          "text-xs font-medium px-2.5 py-1.5 rounded-xl border border-transparent cursor-pointer",
                          "focus:outline-none focus:ring-2 focus:ring-primary/30",
                          ROLE_COLORS[u.role],
                        )}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Fecha */}
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => void handleDelete(u.id, u.email)}
                        className="p-2 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive boty-transition opacity-0 group-hover:opacity-100"
                        aria-label={`Eliminar ${u.email}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal crear usuario */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={(user) => {
            setUsers((prev) => [user, ...prev]);
            setTotal((t) => t + 1);
          }}
        />
      )}
    </div>
  );
}
