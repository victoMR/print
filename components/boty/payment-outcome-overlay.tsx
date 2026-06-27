"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAYMENT_OUTCOME_VISIBLE_MS } from "@/lib/payment-outcome-timing";

type PaymentOutcomeOverlayProps = {
  variant: "success" | "error";
  title: string;
  description?: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Si true, muestra barra de progreso hasta redirigir (solo éxito en checkout). */
  showRedirectProgress?: boolean;
};

export function PaymentOutcomeOverlay({
  variant,
  title,
  description,
  detail,
  actionLabel,
  onAction,
  showRedirectProgress = false,
}: PaymentOutcomeOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const isSuccess = variant === "success";
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const el = dialogRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable[0]?.focus();

    function trapFocus(e: KeyboardEvent) {
      if (e.key !== "Tab" || !el) return;
      const els = Array.from(
        el.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((n) => !n.hasAttribute("disabled"));
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    }
    document.addEventListener("keydown", trapFocus);
    return () => document.removeEventListener("keydown", trapFocus);
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-payment-backdrop-in"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="payment-outcome-title"
    >
      <div
        className={cn(
          "bg-card rounded-3xl p-8 md:p-10 max-w-md w-full text-center boty-shadow border border-border/40 animate-scale-fade-in",
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
          <div className="mt-6 flex flex-col items-center gap-3">
            {showRedirectProgress ? (
              <div
                className="h-1 w-full max-w-[200px] rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Redirigiendo"
              >
                <div
                  className="h-full bg-primary rounded-full origin-left animate-payment-progress"
                  style={{ animationDuration: `${PAYMENT_OUTCOME_VISIBLE_MS}ms` }}
                />
              </div>
            ) : (
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" aria-hidden />
            )}
            <p className="text-xs text-muted-foreground">Redirigiendo a los detalles de tu pedido…</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
