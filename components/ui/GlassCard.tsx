import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  strong?: boolean;
  as?: "div" | "article" | "section";
};

export function GlassCard({
  children,
  className,
  strong = false,
  as: Tag = "div",
}: GlassCardProps) {
  return (
    <Tag
      className={cn(
        "rounded-2xl transition-shadow duration-300",
        strong ? "glass-strong" : "glass",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
