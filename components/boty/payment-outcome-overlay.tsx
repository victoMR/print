"use client";

import { Check, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type PaymentOutcomeOverlayProps = {
  variant: "success" | "error";
  title: string;
  description?: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function PaymentOutcomeOverlay({
  variant,
  title,
  description,
  detail,
  actionLabel,
  onAction,
}: PaymentOutcomeOverlayProps) {
  const isSuccess = variant === "success";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/75 backdrop-blur-md px-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="payment-outcome-title"
    >
      <div
        className={cn(
          "bg-card rounded-3xl p-8 md:p-10 max-w-md w-full text-center boty-shadow animate-scale-fade-in",
          !isSuccess && "animate-payment-shake",
        )}
      >
        <div
          className={cn(
            "mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6",
            isSuccess ? "bg-emerald-500/15 animate-payment-pop" : "bg-destructive/10",
          )}
        >
          {isSuccess ? (
            <Check className="w-10 h-10 text-emerald-600" strokeWidth={2.5} aria-hidden />
          ) : (
            <XCircle className="w-10 h-10 text-destructive" strokeWidth={2.5} aria-hidden />
          )}
        </div>

        <h2 id="payment-outcome-title" className="font-serif text-2xl md:text-3xl text-foreground">
          {title}
        </h2>

        {description && (
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{description}</p>
        )}

        {detail && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-2xl px-4 py-3 mt-4">
            {detail}
          </p>
        )}

        {!isSuccess && actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-6 w-full bg-primary text-primary-foreground py-3 rounded-full text-sm font-medium hover:bg-primary/90 boty-transition"
          >
            {actionLabel}
          </button>
        )}

        {isSuccess && (
          <p className="text-xs text-muted-foreground mt-6">Redirigiendo a tu pedido…</p>
        )}
      </div>
    </div>
  );
}
