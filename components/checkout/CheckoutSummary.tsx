"use client";

import { GlassButton } from "@/components/ui/GlassButton";
import { GlassCard } from "@/components/ui/GlassCard";
import type { ShippingRate } from "@/lib/api-types";
import { cn } from "@/lib/utils";
import { formatMxn } from "@/lib/utils";

type ShippingOptionsProps = {
  rates: ShippingRate[];
  selected: string;
  onSelect: (id: string) => void;
};

export function ShippingOptions({ rates, selected, onSelect }: ShippingOptionsProps) {
  if (rates.length === 0) return null;

  return (
    <GlassCard className="p-6">
      <h3 className="font-semibold mb-4">Opciones de envío</h3>
      <div className="flex flex-col gap-2">
        {rates.map((rate) => (
          <button
            key={rate.id}
            type="button"
            onClick={() => onSelect(rate.id)}
            className={cn(
              "flex items-center justify-between rounded-xl p-4 text-left transition-colors",
              selected === rate.id ? "bg-indigo-500/20 ring-1 ring-indigo-500/40" : "glass",
            )}
          >
            <div>
              <p className="font-medium">{rate.name}</p>
              <p className="text-xs text-foreground/50">
                {rate.minDays}–{rate.maxDays} días
              </p>
            </div>
            <span className="font-semibold">{formatMxn(rate.priceMxn)}</span>
          </button>
        ))}
      </div>
    </GlassCard>
  );
}

type OrderTotalsProps = {
  subtotal: string;
  shipping: string;
  tax: string;
  total: string;
  onSubmit: () => void;
  busy: boolean;
  step: "address" | "rates" | "confirm";
};

export function OrderTotals({
  subtotal,
  shipping,
  tax,
  total,
  onSubmit,
  busy,
  step,
}: OrderTotalsProps) {
  return (
    <GlassCard className="p-6 flex flex-col gap-4">
      <h3 className="font-semibold">Resumen</h3>
      <dl className="flex flex-col gap-2 text-sm">
        <Row label="Subtotal" value={formatMxn(subtotal)} />
        <Row label="Envío" value={formatMxn(shipping)} />
        <Row label="IVA (16%)" value={formatMxn(tax)} />
        <Row label="Total" value={formatMxn(total)} strong />
      </dl>
      {step === "confirm" && (
        <>
          <GlassButton variant="primary" onClick={onSubmit} className={busy ? "opacity-60" : ""}>
            {busy ? "Creando borrador…" : "Crear pedido borrador"}
          </GlassButton>
          <p className="text-xs text-foreground/50">
            No se cobrará aún. El pedido queda en estado draft en Printful hasta integrar pago.
          </p>
        </>
      )}
    </GlassCard>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-foreground/60">{label}</dt>
      <dd className={strong ? "font-bold text-lg" : "font-medium"}>{value}</dd>
    </div>
  );
}
