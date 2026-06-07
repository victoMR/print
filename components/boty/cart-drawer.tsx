"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { RemoteImage } from "@/components/ui/remote-image";
import { useCart } from "@/lib/cart-context";
import { MAX_CART_LINE_QUANTITY } from "@/lib/cart-limits";
import { formatMxn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
  DrawerFooter,
} from "@/components/ui/drawer";

export function CartDrawer() {
  const { items, removeItem, updateQuantity, isOpen, setIsOpen, itemCount, subtotal } = useCart();

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen} direction="right">
      <DrawerContent className="h-full w-full sm:max-w-[440px] flex flex-col">
        {/* Header */}
        <DrawerHeader className="flex items-center justify-between border-b border-border/50 px-6 py-4 shrink-0">
          <div>
            <DrawerTitle className="font-serif text-2xl">Tu carrito</DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground mt-0.5">
              {itemCount === 0 ? "Vacío" : `${itemCount} ${itemCount === 1 ? "artículo" : "artículos"}`}
            </DrawerDescription>
          </div>
          <DrawerClose asChild>
            <button
              type="button"
              className="rounded-full p-2 hover:bg-muted boty-transition text-muted-foreground"
              aria-label="Cerrar carrito"
            >
              <X className="w-5 h-5" />
            </button>
          </DrawerClose>
        </DrawerHeader>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 pb-8">
              <div className="rounded-full bg-muted p-5">
                <ShoppingBag className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Tu carrito está vacío</p>
                <p className="text-sm text-muted-foreground mt-1">Agrega productos para comenzar</p>
              </div>
              <DrawerClose asChild>
                <Link
                  href="/shop"
                  className="mt-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-medium hover:bg-primary/90 boty-transition"
                >
                  Ver colección
                </Link>
              </DrawerClose>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {items.map((item) => (
                <div key={item.variantId} className="py-4 flex gap-4">
                  {/* Thumbnail */}
                  <Link
                    href={`/product/${item.productSlug}`}
                    onClick={() => setIsOpen(false)}
                    className="relative w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden bg-muted block"
                  >
                    <RemoteImage
                      src={item.thumbnail || "/placeholder.svg"}
                      alt={item.productName}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground leading-tight truncate">
                          {item.productName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.variantLabel}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatMxn(item.retailPriceMxn)} c/u
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.variantId)}
                        className="shrink-0 p-1 text-muted-foreground hover:text-destructive boty-transition rounded-full hover:bg-destructive/5"
                        aria-label="Quitar del carrito"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Qty controls */}
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center border border-border rounded-full bg-background">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-muted boty-transition rounded-full"
                          aria-label="Menos"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          disabled={
                            item.quantity >= (item.maxQuantity ?? MAX_CART_LINE_QUANTITY)
                          }
                          className="w-8 h-8 flex items-center justify-center hover:bg-muted boty-transition rounded-full disabled:opacity-40 disabled:pointer-events-none"
                          aria-label="Más"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {formatMxn(Number.parseFloat(item.retailPriceMxn) * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <DrawerFooter className="border-t border-border/50 px-6 py-5 shrink-0 gap-3">
            {/* Totals */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({itemCount} {itemCount === 1 ? "artículo" : "artículos"})</span>
                <span>{formatMxn(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Envío</span>
                <span className="text-xs italic">Se calcula en checkout</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>IVA (16 %)</span>
                <span>Incluido en checkout</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border/50 font-semibold text-base text-foreground">
                <span>Total estimado</span>
                <span>{formatMxn(subtotal)}</span>
              </div>
            </div>

            {/* CTA */}
            <Link
              href="/checkout"
              onClick={() => setIsOpen(false)}
              className="w-full bg-primary text-primary-foreground py-3.5 rounded-full font-medium hover:bg-primary/90 boty-transition text-center text-sm"
            >
              Ir a checkout →
            </Link>
            <DrawerClose asChild>
              <button
                type="button"
                className="w-full border border-border text-foreground py-3 rounded-full text-sm font-medium hover:bg-muted boty-transition"
              >
                Seguir comprando
              </button>
            </DrawerClose>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
