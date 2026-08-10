"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import {
  Check,
  Circle,
  ExternalLink,
  Loader2,
  MapPin,
  Package,
  Truck,
} from "lucide-react";
import type { OrderDetail } from "@/lib/api-types";
import type { MrpapsOrderStatus } from "@/lib/api-types";
import { mxStateLabel } from "@/lib/mx-state-label";
import { cn, formatCurrency } from "@/lib/utils";
import { formatOrderDate } from "@/lib/i18n/format-date";
import { useLanguage } from "@/lib/i18n/language-context";
import { RemoteImage } from "@/components/ui/remote-image";
import { BotyBadge, BotySurface } from "@/components/boty/ui-patterns";

const KNOWN_PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
function isKnownPaymentStatus(value: string): value is (typeof KNOWN_PAYMENT_STATUSES)[number] {
  return (KNOWN_PAYMENT_STATUSES as readonly string[]).includes(value);
}

const STATUS_BADGE: Record<MrpapsOrderStatus, string> = {
  pendiente_pago: "bg-amber-500/15 text-amber-900",
  pedido: "bg-blue-500/15 text-blue-800",
  solicitado_imprenta: "bg-amber-500/15 text-amber-900",
  recibido_imprenta: "bg-violet-500/15 text-violet-900",
  enviado: "bg-emerald-500/15 text-emerald-800",
  cancelado: "bg-muted text-muted-foreground",
};

type OrderDetailViewProps = {
  order: OrderDetail;
  /** Mensaje hero tras checkout */
  showThankYou?: boolean;
  variant?: "public" | "account";
  backHref?: string;
  backLabel?: string;
};

export function OrderDetailView({
  order,
  showThankYou = false,
  variant = "public",
  backHref,
  backLabel,
}: OrderDetailViewProps) {
  const t = useTranslations("orderDetail");
  const language = useLanguage();
  const currency = order.currency;
  // La orden ya se cobró en una moneda fija — se muestra esa, no la del navegador actual.
  const amount = (mxn: string | null, usd: string | null): string =>
    formatCurrency((currency === "USD" ? usd : mxn) ?? "0", currency);
  const resolvedBackLabel = backLabel ?? t("back");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {showThankYou && (
        <div className="text-center mb-2 animate-thank-you-in">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4 animate-payment-pop">
            <Check className="w-8 h-8 text-emerald-600" strokeWidth={2.5} aria-hidden />
          </div>
          <p className="text-sm text-primary font-medium">{t("paymentConfirmed")}</p>
          <h1 className="font-serif text-3xl md:text-4xl mt-2">{t("thankYou")}</h1>
          <p className="text-muted-foreground text-sm mt-2">
            {t("confirmationSentTo", { email: order.customer.email })}
          </p>
          <p className="text-sm mt-4 bg-muted/50 rounded-2xl px-4 py-3 inline-block">
            {t("trackingCodeLabel")}{" "}
            <span className="font-mono font-semibold text-foreground tracking-wide">
              {order.trackingCode}
            </span>
          </p>
        </div>
      )}

      {backHref && (
        <Link
          href={backHref}
          className="inline-flex text-sm text-muted-foreground hover:text-primary boty-transition"
        >
          ← {resolvedBackLabel}
        </Link>
      )}

      <BotySurface className="p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {t("trackingCode")}
            </p>
            <h2 className="font-serif text-2xl md:text-3xl mt-1 font-mono tracking-wide">
              {order.trackingCode}
            </h2>
            {variant === "account" && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("internalRef", { orderNumber: order.orderNumber })}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {formatOrderDate(order.orderedAt, language)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <BotyBadge className={STATUS_BADGE[order.status]}>
              {t(`status.${order.status}`)}
            </BotyBadge>
            {order.paymentStatus && (
              <span className="text-xs text-muted-foreground">
                {isKnownPaymentStatus(order.paymentStatus)
                  ? t(`paymentStatus.${order.paymentStatus}`)
                  : order.paymentStatus}
              </span>
            )}
            <p className="font-serif text-2xl text-primary tabular-nums">
              {amount(order.totals.totalMxn, order.totals.totalUsd)}
            </p>
          </div>
        </div>

        <OrderTimeline timeline={order.timeline} className="mt-8" />
      </BotySurface>

      <div className="grid gap-6 lg:grid-cols-2">
        <BotySurface className="p-6">
          <h3 className="font-medium flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-primary" />
            {t("products", { count: order.items.length })}
          </h3>
          <ul className="space-y-4">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-4">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-muted shrink-0 ring-1 ring-border/60">
                  {item.thumbnailUrl ? (
                    <RemoteImage
                      src={item.thumbnailUrl}
                      alt={item.productName}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Package className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium leading-snug">{item.productName}</p>
                  <p className="text-sm text-muted-foreground">{item.variantLabel}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">SKU: {item.sku}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                    <span className="text-sm text-muted-foreground">
                      {item.quantity} × {amount(item.unitPriceMxn, item.unitPriceUsd)}
                    </span>
                    <span className="font-semibold tabular-nums">{amount(item.lineTotalMxn, item.lineTotalUsd)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </BotySurface>

        <div className="space-y-6">
          <BotySurface className="p-6">
            <h3 className="font-medium flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-primary" />
              {t("shipping")}
            </h3>
            {order.shipping.label && (
              <p className="text-sm font-medium mb-2">{order.shipping.label}</p>
            )}
            <address className="text-sm text-muted-foreground not-italic leading-relaxed">
              {order.customer.name}
              <br />
              {order.shipping.address1}
              {order.shipping.address2 && (
                <>
                  <br />
                  {order.shipping.address2}
                </>
              )}
              <br />
              {order.shipping.city}, {mxStateLabel(order.shipping.stateCode)} {order.shipping.zip}
              <br />
              {order.shipping.countryCode}
            </address>
            {order.tracking.url && (
              <a
                href={order.tracking.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 text-sm text-primary hover:underline"
              >
                <Truck className="w-4 h-4" />
                {t("trackPackage")}
                {order.tracking.carrier && ` · ${order.tracking.carrier}`}
              </a>
            )}
          </BotySurface>

          <BotySurface className="p-6">
            <h3 className="font-medium mb-4">{t("paymentSummary")}</h3>
            <dl className="space-y-2 text-sm">
              <Row label={t("subtotal")} value={amount(order.totals.subtotalMxn, order.totals.subtotalUsd)} />
              <Row label={t("shipping")} value={amount(order.totals.shippingMxn, order.totals.shippingUsd)} />
              <Row
                label={currency === "USD" ? t("taxUS") : t("tax")}
                value={amount(order.totals.taxMxn, order.totals.taxUsd)}
              />
              <div className="border-t border-border/60 pt-3 flex justify-between font-semibold text-base">
                <dt>{t("total")}</dt>
                <dd className="text-primary tabular-nums">{amount(order.totals.totalMxn, order.totals.totalUsd)}</dd>
              </div>
            </dl>
          </BotySurface>
        </div>
      </div>

      {!showThankYou && (
        <p className="text-center text-xs text-muted-foreground">
          {t("willNotifyByEmail")}
        </p>
      )}

      {showThankYou && (
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          {variant === "account" ? (
            <Link
              href="/cuenta/pedidos"
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-medium hover:bg-primary/90 boty-transition"
            >
              {t("viewAllOrders")}
            </Link>
          ) : (
            <Link
              href="/seguimiento"
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-medium hover:bg-primary/90 boty-transition"
            >
              {t("trackAnotherOrder")}
            </Link>
          )}
          <Link
            href="/shop"
            className="px-6 py-2.5 rounded-full text-sm font-medium border border-border hover:bg-muted boty-transition"
          >
            {t("keepShopping")}
          </Link>
        </div>
      )}
    </div>
  );
}

export function OrderDetailSkeleton() {
  const t = useTranslations("orderDetail");
  return (
    <div className="max-w-4xl mx-auto flex flex-col items-center gap-4 py-16">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{t("loadingOrder")}</p>
    </div>
  );
}

function OrderTimeline({
  timeline,
  className,
}: {
  timeline: OrderDetail["timeline"];
  className?: string;
}) {
  const t = useTranslations("orderDetail");
  const language = useLanguage();
  return (
    <ol className={cn("flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-0", className)}>
      {timeline.map((step, idx) => (
        <li
          key={`${step.status}-${idx}`}
          className={cn(
            "flex sm:flex-1 sm:flex-col sm:items-center gap-3 sm:gap-2 relative",
            idx < timeline.length - 1 && "sm:pb-0",
          )}
        >
          {idx < timeline.length - 1 && (
            <span
              className="hidden sm:block absolute top-5 left-[calc(50%+20px)] right-0 h-0.5 bg-border"
              aria-hidden
            />
          )}
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10",
              step.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              step.current && "ring-2 ring-primary/30 ring-offset-2",
            )}
          >
            {step.done ? <Check className="w-5 h-5" /> : <Circle className="w-4 h-4" />}
          </div>
          <div className="sm:text-center min-w-0">
            <p className={cn("text-sm font-medium", step.current && "text-primary")}>
              {t(`status.${step.status}`)}
            </p>
            {step.at && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatOrderDate(step.at, language, { day: "numeric", month: "short" })}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
