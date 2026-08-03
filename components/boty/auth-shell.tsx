"use client";

import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { Footer } from "./footer";

type AuthShellProps = {
  children: React.ReactNode;
  /** admin = tono más sobrio para panel interno */
  variant?: "customer" | "admin";
};

export function AuthShell({ children, variant = "customer" }: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          variant === "customer"
            ? "bg-gradient-to-br from-secondary/50 via-background to-accent/40"
            : "bg-gradient-to-br from-muted via-background to-secondary/30",
        )}
      />
      <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-primary/8 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -left-32 h-96 w-96 rounded-full bg-accent/50 blur-3xl" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="px-6 pt-8 pb-4 flex justify-center">
          <Link
            href={variant === "admin" ? "/admin" : "/"}
            className="font-serif text-3xl tracking-wide text-foreground hover:opacity-80 boty-transition"
          >
            Mr. Paps
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-4 py-8">
          <div className="w-full max-w-md animate-blur-in">{children}</div>
        </div>

        {variant === "customer" && (
          <div className="mt-auto w-full shrink-0">
            <Footer variant="compact" />
          </div>
        )}
      </div>
    </main>
  );
}

export function AuthCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/70 bg-card/95 backdrop-blur-xl p-8 md:p-10 boty-shadow",
        className,
      )}
    >
      {children}
    </div>
  );
}
