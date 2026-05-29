"use client";

import { GlassButton } from "@/components/ui/GlassButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { PriceTag } from "@/components/ui/PriceTag";
import { useCart } from "@/lib/cart-context";
import { formatMxn } from "@/lib/utils";
import Image from "next/image";

export function CartView() {
  const { items, updateQuantity, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <GlassCard className="p-10 text-center">
        <p className="text-lg font-semibold">Tu carrito está vacío</p>
        <p className="mt-2 text-sm text-foreground/60">
          Explora el catálogo y agrega productos.
        </p>
        <GlassButton href="/catalogo" className="mt-6">
          Ver catálogo
        </GlassButton>
      </GlassCard>
    );
  }

  const subtotal = items.reduce(
    (sum, item) => sum + Number.parseFloat(item.retailPriceMxn) * item.quantity,
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-4 list-none p-0 m-0">
        {items.map((item) => (
          <li key={item.variantId}>
            <GlassCard className="flex gap-4 p-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                <Image src={item.thumbnail} alt={item.productName} fill className="object-cover" />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-foreground/60">{item.variantLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.variantId)}
                    className="text-xs text-foreground/50 hover:text-red-500"
                  >
                    Quitar
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QtyBtn
                      label="−"
                      onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                    />
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <QtyBtn
                      label="+"
                      onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                    />
                  </div>
                  <span className="font-medium">
                    {formatMxn(Number.parseFloat(item.retailPriceMxn) * item.quantity)}
                  </span>
                </div>
              </div>
            </GlassCard>
          </li>
        ))}
      </ul>

      <GlassCard className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm text-foreground/60">Subtotal</p>
          <PriceTag amount={subtotal.toFixed(2)} note="IVA y envío en checkout" />
        </div>
        <GlassButton href="/checkout">Ir a checkout</GlassButton>
      </GlassCard>
    </div>
  );
}

function QtyBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-full glass text-sm"
    >
      {label}
    </button>
  );
}
