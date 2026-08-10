"use client";

import { US_STATES } from "@/lib/us-states";

type UsAddressValue = {
  zip: string;
  stateCode: string;
  city: string;
};

/** Formats to 5 digits, or 9 digits as ZIP+4 (12345-6789). */
function formatUsZip(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 9);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

type UsAddressGeoFieldsProps = {
  value: UsAddressValue;
  onChange: (patch: Partial<UsAddressValue>) => void;
  disabled?: boolean;
  labels?: {
    zip?: string;
    state?: string;
    city?: string;
  };
  errors?: {
    zip?: string;
    stateCode?: string;
    city?: string;
  };
};

export function UsAddressGeoFields({
  value,
  onChange,
  disabled,
  labels,
  errors,
}: UsAddressGeoFieldsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label className="block text-[10px] tracking-[0.18em] uppercase text-[#7A756E] mb-1.5">
          {labels?.zip ?? "ZIP"}
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={10}
          disabled={disabled}
          value={value.zip}
          onChange={(e) => onChange({ zip: formatUsZip(e.target.value) })}
          className="w-full border border-[#D4CFC5] bg-[#f8f9fa] px-3 py-2.5 text-sm text-[#2A2726] outline-none focus:border-[#5C1A24]"
          autoComplete="postal-code"
        />
        {errors?.zip ? <p className="mt-1 text-xs text-red-600">{errors.zip}</p> : null}
      </div>
      <div>
        <label className="block text-[10px] tracking-[0.18em] uppercase text-[#7A756E] mb-1.5">
          {labels?.state ?? "State"}
        </label>
        <select
          disabled={disabled}
          value={value.stateCode}
          onChange={(e) => onChange({ stateCode: e.target.value })}
          className="w-full border border-[#D4CFC5] bg-[#f8f9fa] px-3 py-2.5 text-sm text-[#2A2726] outline-none focus:border-[#5C1A24]"
          autoComplete="address-level1"
        >
          {US_STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
        {errors?.stateCode ? <p className="mt-1 text-xs text-red-600">{errors.stateCode}</p> : null}
      </div>
      <div>
        <label className="block text-[10px] tracking-[0.18em] uppercase text-[#7A756E] mb-1.5">
          {labels?.city ?? "City"}
        </label>
        <input
          type="text"
          disabled={disabled}
          value={value.city}
          onChange={(e) => onChange({ city: e.target.value })}
          className="w-full border border-[#D4CFC5] bg-[#f8f9fa] px-3 py-2.5 text-sm text-[#2A2726] outline-none focus:border-[#5C1A24]"
          autoComplete="address-level2"
        />
        {errors?.city ? <p className="mt-1 text-xs text-red-600">{errors.city}</p> : null}
      </div>
    </div>
  );
}
