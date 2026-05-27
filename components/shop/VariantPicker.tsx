"use client";

import { cn } from "@/lib/utils";

type VariantPickerProps = {
  label: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
};

export function VariantPicker({ label, options, selected, onSelect }: VariantPickerProps) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className={cn(
              "rounded-full px-4 py-2 text-sm transition-all",
              selected === opt
                ? "bg-gradient-to-r from-indigo-500 to-pink-500 text-white"
                : "glass hover:bg-white/30",
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export function QtyButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full glass text-lg"
    >
      {label}
    </button>
  );
}
