"use client";

import { GlassButton } from "@/components/ui/GlassButton";
import { GlassCard } from "@/components/ui/GlassCard";
import type { CheckoutRecipient } from "@/lib/api-types";
import { MxAddressGeoFields } from "@/components/checkout/mx-address-geo-fields";

type AddressFormProps = {
  recipient: CheckoutRecipient;
  onChange: (r: CheckoutRecipient) => void;
  onSubmit: () => void;
  busy: boolean;
};

export function AddressForm({ recipient, onChange, onSubmit, busy }: AddressFormProps) {
  return (
    <GlassCard className="p-6">
      <h2 className="text-lg font-semibold mb-4">Dirección de envío (MX)</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex flex-col gap-3"
      >
        <Field label="Nombre" value={recipient.name} onChange={(v) => onChange({ ...recipient, name: v })} required />
        <Field label="Email" type="email" value={recipient.email} onChange={(v) => onChange({ ...recipient, email: v })} required />
        <Field label="Teléfono" value={recipient.phone} onChange={(v) => onChange({ ...recipient, phone: v })} required />
        <Field label="Calle y número" value={recipient.address1} onChange={(v) => onChange({ ...recipient, address1: v })} required />
        <MxAddressGeoFields
          value={{
            zip: recipient.zip,
            stateCode: recipient.stateCode,
            city: recipient.city,
            address2: recipient.address2,
          }}
          onChange={(patch) => onChange({ ...recipient, ...patch })}
        />
        <GlassButton type="submit" variant="primary">{busy ? "Cotizando…" : "Cotizar envío"}</GlassButton>
      </form>
    </GlassCard>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  pattern,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  pattern?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        pattern={pattern}
        className="rounded-xl glass px-3 py-2 bg-transparent outline-none focus:ring-2 focus:ring-indigo-500/40"
      />
    </label>
  );
}
