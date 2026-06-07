"use client";

import { cn } from "@/lib/utils";
import { BotySurface } from "@/components/boty/ui-patterns";

/** Grid estándar para cards del panel admin. */
export const ADMIN_GRID_CLASS =
  "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";

/** Barra de filtros estándar. */
export const ADMIN_FILTER_SURFACE_CLASS =
  "p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4";

/** Estado vacío estándar. */
export const ADMIN_EMPTY_SURFACE_CLASS =
  "p-12 text-center text-muted-foreground text-sm";

type AdminGridCardProps = {
  media: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  dimmed?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Card de grid unificada: media 4:3 + cuerpo con altura mínima consistente.
 */
export function AdminGridCard({
  media,
  onClick,
  disabled,
  className,
  dimmed,
  footer,
  children,
}: AdminGridCardProps) {
  const surface = (
    <BotySurface
      className={cn(
        "overflow-hidden flex flex-col h-full p-0 boty-transition",
        onClick && "hover:border-primary/40",
        dimmed && "opacity-60",
        className,
      )}
    >
      <div className="relative aspect-[4/3] bg-muted overflow-hidden shrink-0 group/media">{media}</div>
      <div className="p-4 flex-1 flex flex-col gap-2 min-h-[132px]">
        {children}
        {footer ? <div className="mt-auto pt-2">{footer}</div> : null}
      </div>
    </BotySurface>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="w-full text-left h-full boty-transition hover:opacity-95 disabled:opacity-50"
      >
        {surface}
      </button>
    );
  }

  return <article className="h-full">{surface}</article>;
}
