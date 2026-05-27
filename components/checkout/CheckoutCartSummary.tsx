"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import type { CartItem } from "@/lib/api-types";
import { formatMxn } from "@/lib/utils";
import Image from "next/image";

type CheckoutCartSummaryProps = {
  items: CartItem[];
};

export function CheckoutCartSummary({ items }: CheckoutCartSummaryProps) {
  const subtotal = items.reduce(
    (sum, item) => sum + Number.parseFloat(item.retailPriceMxn) * item.quantity,
    0,
  );

  return (
    <GlassCard className="p-6">
      <h2 className="text-lg font-semibold mb-4">Tu pedido</h2>
      <ul className="flex flex-col gap-3 list-none p-0 m-0 mb-4">
        {items.map((item) => (
          <li key={item.syncVariantId} className="flex gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
              <Image
                src={item.thumbnail}
                alt={item.productName}
                fill
                className="object-cover"
                sizes="56px"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{item.productName}</p>
              <p className="text-xs text-foreground/55">{item.variantLabel}</p>
              <p className="text-xs text-foreground/55 mt-0.5">
                {item.quantity} × {formatMxn(item.retailPriceMxn)}
              </p>
            </div>
            <span className="text-sm font-medium shrink-0">
              {formatMxn(Number.parseFloat(item.retailPriceMxn) * item.quantity)}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex justify-between border-t border-white/10 pt-3 text-sm">
        <span className="text-foreground/60">Subtotal productos</span>
        <span className="font-semibold">{formatMxn(subtotal.toFixed(2))}</span>
      </div>
    </GlassCard>
  );
}
