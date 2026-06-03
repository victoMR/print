"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function BotySurface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/60 bg-card/90 backdrop-blur-md boty-shadow",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function BotyPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h2 className="font-serif text-2xl md:text-3xl text-foreground tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function BotyAlert({
  children,
  variant = "error",
  className,
}: {
  children: React.ReactNode;
  variant?: "error" | "success" | "info";
  className?: string;
}) {
  return (
    <p
      role="alert"
      className={cn(
        "text-sm rounded-2xl px-4 py-3",
        className,
        variant === "error" && "text-destructive bg-destructive/10",
        variant === "success" && "text-green-800 bg-green-500/10",
        variant === "info" && "text-foreground/80 bg-secondary/80",
      )}
    >
      {children}
    </p>
  );
}

export function BotyLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("text-sm font-medium text-foreground/90", className)}>{children}</span>;
}

export function BotyInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-2xl border border-border/80 bg-background/80 px-4 py-3 text-sm",
        "outline-none transition-shadow placeholder:text-muted-foreground/70",
        "focus:ring-2 focus:ring-primary/25 focus:border-primary/40",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-muted/50",
        className,
      )}
      {...props}
    />
  );
}

export function BotySelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-2xl border border-border/80 bg-background/80 px-4 py-3 text-sm",
        "outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function BotyTextarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-2xl border border-border/80 bg-background/80 px-4 py-3 text-sm min-h-[96px]",
        "outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40",
        className,
      )}
      {...props}
    />
  );
}

export function BotyButton({
  children,
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-full boty-transition disabled:opacity-50 disabled:pointer-events-none",
        size === "sm" && "px-4 py-2 text-xs",
        size === "md" && "px-6 py-2.5 text-sm",
        size === "lg" && "px-8 py-3.5 text-sm",
        variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/60",
        variant === "ghost" && "text-muted-foreground hover:text-foreground hover:bg-muted/60",
        variant === "danger" && "text-destructive border border-destructive/30 hover:bg-destructive/5",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function BotyBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-medium px-3 py-1 rounded-full",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function BotyModal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-16 pb-10">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal
        aria-labelledby="boty-modal-title"
        className={cn(
          "relative z-10 w-full rounded-3xl bg-card shadow-2xl border border-white/50",
          size === "sm" && "max-w-md",
          size === "md" && "max-w-xl",
          size === "lg" && "max-w-2xl",
          size === "xl" && "max-w-4xl",
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-border/50">
          <div>
            <h2 id="boty-modal-title" className="font-serif text-xl text-foreground">{title}</h2>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 boty-transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function BotyTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-2xl bg-muted/60 w-fit mb-5">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "px-4 py-1.5 text-sm rounded-xl boty-transition",
            active === t.id
              ? "bg-background shadow-sm text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function BotyEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <BotySurface className="p-12 text-center">
      <p className="font-serif text-xl text-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </BotySurface>
  );
}
