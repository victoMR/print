import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

type GlassButtonProps = {
  href?: string;
  children: ReactNode;
  className?: string;
  variant?: "primary" | "ghost";
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all duration-300";

const variants = {
  primary:
    "bg-gradient-to-r from-indigo-500 to-pink-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02]",
  ghost:
    "glass text-foreground hover:bg-white/20 dark:hover:bg-white/10",
};

export function GlassButton({
  href,
  children,
  className,
  variant = "primary",
  onClick,
  type = "button",
  disabled,
}: GlassButtonProps) {
  const classes = cn(
    base,
    variants[variant],
    disabled && "pointer-events-none opacity-50 cursor-not-allowed",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
