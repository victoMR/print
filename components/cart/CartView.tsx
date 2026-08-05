"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCart } from "@/lib/cart-context";
import { MAX_CART_LINE_QUANTITY } from "@/lib/cart-limits";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";
import { Link } from "@/lib/i18n/navigation";
import { Minus, Plus, X, Truck, RotateCcw } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";

// Estimado previo al checkout (el monto real se calcula en /checkout según
// dirección/moneda) — coincide con el valor base de la tabla de envío en USD.
const SHIPPING_ESTIMATE = { MXN: 150, USD: 12 };

export function CartView() {
  const t = useTranslations("cart");
  const market = useLocale() as Locale;
  const { items, currency, itemPrice, updateQuantity, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <div className="text-center py-20 border border-[#D4CFC5] bg-[#f8f9fa]">
        <p className="text-[13px] tracking-[0.15em] uppercase text-[#7A756E] mb-2">
          {t("empty.title")}
        </p>
        <p className="text-[12px] text-[#7A756E]/70 mb-8">
          {t("empty.subtitle")}
        </p>
        <Link
          href="/shop"
          className="inline-block bg-[#5C1A24] text-[#f8f9fa] px-8 py-3.5 text-[11px] tracking-[0.22em] uppercase font-sans hover:bg-[#4A1520] boty-transition"
        >
          {t("viewCollection")}
        </Link>
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => {
    const price = itemPrice(item);
    return price ? sum + Number.parseFloat(price) * item.quantity : sum;
  }, 0);
  const shippingEstimate = SHIPPING_ESTIMATE[currency];
  const total = subtotal + shippingEstimate;

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-10 items-start">
      {/* Cart items table */}
      <div>
        {/* Table header */}
        <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-6 pb-3 border-b border-[#D4CFC5] mb-2">
          {[t("table.product"), t("table.price"), t("table.quantity"), t("table.total"), ""].map((h, i) => (
            <span key={i} className="text-[10px] tracking-[0.22em] uppercase text-[#7A756E] font-sans">
              {h}
            </span>
          ))}
        </div>

        {/* Items */}
        <ul className="divide-y divide-[#D4CFC5] list-none p-0 m-0">
          {items.map((item) => {
            const price = itemPrice(item);
            const lineTotal = price ? Number.parseFloat(price) * item.quantity : null;
            return (
              <li key={item.variantId} className="py-6">
                <div className="grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 md:gap-6 items-center">
                  {/* Thumbnail */}
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-[#EBE7DB]">
                    <Image
                      src={item.thumbnail}
                      alt={item.productName}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Name + variant */}
                  <div>
                    <p className="text-[12px] tracking-[0.12em] uppercase font-sans text-[#2A2726] mb-1">
                      {item.productName}
                    </p>
                    <p className="text-[11px] text-[#7A756E] tracking-[0.08em]">
                      {item.variantLabel}
                    </p>
                  </div>

                  {/* Unit price */}
                  <span className="hidden md:block text-[12px] tracking-[0.08em] text-[#2A2726]">
                    {price !== null ? formatCurrency(price, currency) : "—"}
                  </span>

                  {/* Quantity controls */}
                  <div className="inline-flex items-center border border-[#D4CFC5]">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center text-[#7A756E] hover:text-[#2A2726] border-r border-[#D4CFC5] boty-transition"
                      aria-label={t("decreaseQuantity")}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-[12px] font-sans text-[#2A2726]">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      disabled={item.quantity >= (item.maxQuantity ?? MAX_CART_LINE_QUANTITY)}
                      onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-[#7A756E] hover:text-[#2A2726] border-l border-[#D4CFC5] boty-transition disabled:opacity-40"
                      aria-label={t("increaseQuantity")}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line total */}
                  <span className="hidden md:block text-[12px] tracking-[0.08em] text-[#2A2726] font-sans">
                    {lineTotal !== null ? formatCurrency(lineTotal.toFixed(2), currency) : "—"}
                  </span>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeItem(item.variantId)}
                    className="text-[#D4CFC5] hover:text-[#5C1A24] boty-transition"
                    aria-label={t("remove")}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Continue shopping */}
        <div className="mt-6">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-[#7A756E] hover:text-[#2A2726] boty-transition"
          >
            ← {t("continueShopping")}
          </Link>
        </div>
      </div>

      {/* Order summary */}
      <div className="border border-[#D4CFC5] p-6 bg-[#f8f9fa]">
        <h2 className="text-[11px] tracking-[0.25em] uppercase font-sans text-[#2A2726] mb-6 pb-4 border-b border-[#D4CFC5]">
          {t("orderSummary")}
        </h2>

        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] tracking-[0.15em] uppercase text-[#7A756E]">{t("subtotal")}</span>
            <span className="text-[12px] tracking-[0.06em] text-[#2A2726]">
              {formatCurrency(subtotal.toFixed(2), currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] tracking-[0.15em] uppercase text-[#7A756E]">{t("shipping")}</span>
            <span className="text-[12px] tracking-[0.06em] text-[#2A2726]">
              {formatCurrency(shippingEstimate.toFixed(2), currency)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-5 border-t border-[#D4CFC5] mb-6">
          <span className="text-[12px] tracking-[0.2em] uppercase font-sans text-[#2A2726]">{t("total")}</span>
          <span className="text-xl tracking-[0.08em] font-sans text-[#2A2726]">
            {formatCurrency(total.toFixed(2), currency)}
          </span>
        </div>

        <Link
          href="/checkout"
          className="block w-full text-center bg-[#5C1A24] text-[#f8f9fa] py-4 text-[11px] tracking-[0.25em] uppercase font-sans hover:bg-[#4A1520] boty-transition mb-6"
        >
          {t("checkoutButton")}
        </Link>

        {/* Trust badges */}
        <div className="space-y-3 pt-4 border-t border-[#D4CFC5]">
          <div className="flex items-center gap-3">
            <Truck className="w-4 h-4 text-[#7A756E] shrink-0" />
            <span className="text-[10px] tracking-[0.1em] uppercase text-[#7A756E]">
              {t(`shipsNationwide.${market}`)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <RotateCcw className="w-4 h-4 text-[#7A756E] shrink-0" />
            <span className="text-[10px] tracking-[0.1em] uppercase text-[#7A756E]">
              {t("returnsPolicy")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
