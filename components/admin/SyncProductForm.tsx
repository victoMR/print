"use client";

import { GlassButton } from "@/components/ui/GlassButton";
import { GlassCard } from "@/components/ui/GlassCard";
import type { SyncProductPayload } from "@/lib/api-types";
import { useState } from "react";

type SyncProductFormProps = {
  defaultVariantId?: number;
  onSubmit: (payload: SyncProductPayload) => Promise<void>;
};

export function SyncProductForm({ defaultVariantId, onSubmit }: SyncProductFormProps) {
  const [externalId, setExternalId] = useState(`prod-${Date.now()}`);
  const [name, setName] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [variantId, setVariantId] = useState(defaultVariantId?.toString() ?? "");
  const [variantExternalId, setVariantExternalId] = useState(`var-${Date.now()}`);
  const [retailPrice, setRetailPrice] = useState("599.00");
  const [fileUrl, setFileUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      await onSubmit({
        externalId,
        name,
        thumbnail,
        variants: [{
          externalId: variantExternalId,
          variantId: Number.parseInt(variantId, 10),
          retailPrice,
          files: [{ type: "default", url: fileUrl }],
        }],
      });
      setStatus("Producto sync creado correctamente.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error al crear producto");
    } finally {
      setBusy(false);
    }
  }

  return (
    <GlassCard className="p-6">
      <h2 className="text-lg font-semibold mb-4">Crear Sync Product</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Field label="external_id" value={externalId} onChange={setExternalId} />
        <Field label="Nombre" value={name} onChange={setName} required />
        <Field label="Thumbnail URL" value={thumbnail} onChange={setThumbnail} required />
        <Field label="variant_id (catálogo)" value={variantId} onChange={setVariantId} required />
        <Field label="variant external_id" value={variantExternalId} onChange={setVariantExternalId} />
        <Field label="retail_price MXN" value={retailPrice} onChange={setRetailPrice} />
        <Field label="Archivo impresión URL" value={fileUrl} onChange={setFileUrl} required />
        <GlassButton type="submit" variant="primary" className={busy ? "opacity-60" : ""}>
          {busy ? "Creando…" : "Crear en Printful"}
        </GlassButton>
        {status && <p className="text-sm text-foreground/70">{status}</p>}
      </form>
    </GlassCard>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="rounded-xl glass px-3 py-2 bg-transparent outline-none focus:ring-2 focus:ring-indigo-500/40"
      />
    </label>
  );
}
