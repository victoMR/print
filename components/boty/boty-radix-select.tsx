"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BotyLabel } from "@/components/boty/ui-patterns";
import { cn } from "@/lib/utils";

export type BotyRadixSelectOption = {
  value: string;
  label: string;
};

type BotyRadixSelectProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: BotyRadixSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
};

export function BotyRadixSelect({
  label,
  value,
  onValueChange,
  options,
  placeholder = "Seleccionar…",
  disabled,
  className,
  required,
}: BotyRadixSelectProps) {
  return (
    <label className={cn("flex flex-col gap-2", className)}>
      <BotyLabel>
        {label}
        {required ? " *" : ""}
      </BotyLabel>
      <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="h-11 rounded-2xl border-border/80 bg-background/80">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
