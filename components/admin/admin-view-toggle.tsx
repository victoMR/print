"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminViewMode = "grid" | "list";

type AdminViewToggleProps = {
  value: AdminViewMode;
  onChange: (mode: AdminViewMode) => void;
  className?: string;
};

export function AdminViewToggle({ value, onChange, className }: AdminViewToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex rounded-xl border border-border/80 bg-background/80 p-0.5 shrink-0",
        className,
      )}
      role="group"
      aria-label="Modo de vista"
    >
      <button
        type="button"
        onClick={() => onChange("grid")}
        className={cn(
          "inline-flex items-center justify-center w-9 h-9 rounded-lg boty-transition",
          value === "grid"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
        )}
        aria-label="Vista en cuadrícula"
        aria-pressed={value === "grid"}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        className={cn(
          "inline-flex items-center justify-center w-9 h-9 rounded-lg boty-transition",
          value === "list"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
        )}
        aria-label="Vista en lista"
        aria-pressed={value === "list"}
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}

export function useAdminViewMode(storageKey: string, defaultMode: AdminViewMode = "grid") {
  const [mode, setMode] = useState<AdminViewMode>(defaultMode);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved === "grid" || saved === "list") setMode(saved);
    } catch {
      // ignore
    }
  }, [storageKey]);

  function setViewMode(next: AdminViewMode) {
    setMode(next);
    try {
      sessionStorage.setItem(storageKey, next);
    } catch {
      // ignore
    }
  }

  return [mode, setViewMode] as const;
}
