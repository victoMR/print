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
  const { items, inStockItems, outOfStockItems, removeItem, updateQuantity, isOpen, setIsOpen, itemCount, subtotal } = useCart();

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen} direction="right">
      <DrawerContent className="h-full w-full sm:max-w-[420px] flex flex-col bg-[#F5F0E6]">
        {/* Header */}
        <DrawerHeader className="flex items-center justify-between border-b border-[#D4CFC5] px-6 py-5 shrink-0">
          <div>
            <DrawerTitle className="font-serif text-2xl tracking-[0.1em] uppercase text-[#2A2726]">
              CARRITO
            </DrawerTitle>
            <DrawerDescription className="text-[11px] tracking-[0.15em] uppercase text-[#7A756E] mt-1">
              {itemCount === 0 ? "VACÍO" : `${itemCount} ${itemCount === 1 ? "ARTÍCULO" : "ARTÍCULOS"}`}
            </DrawerDescription>
          </div>
          <DrawerClose asChild>
            <button
              type="button"
              className="p-2 text-[#7A756E] hover:text-[#2A2726] boty-transition"
              aria-label="Cerrar carrito"
            >
              <X className="w-5 h-5" />
            </button>
          </DrawerClose>
        </DrawerHeader>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-5 pb-8">
              <ShoppingBag className="w-10 h-10 text-[#D4CFC5]" />
              <div>
                <p className="text-[12px] tracking-[0.15em] uppercase font-sans text-[#2A2726]">
                  Tu carrito está vacío
                </p>
                <p className="text-[11px] text-[#7A756E] mt-1">Agrega productos para comenzar</p>
              </div>
              <DrawerClose asChild>
                <Link
                  href="/shop"
                  className="mt-2 bg-[#5C1A24] text-[#f8f9fa] px-8 py-3 text-[11px] tracking-[0.22em] uppercase hover:bg-[#4A1520] boty-transition"
                >
                  VER COLECCIÓN
                </Link>
              </DrawerClose>
            </div>
          ) : (
            <div>
              {/* In-stock items */}
              <div className="divide-y divide-[#D4CFC5]">
                {inStockItems.map((item) => (
                  <div key={item.variantId} className="py-5 flex gap-4">
                    <Link
                      href={`/product/${item.productSlug}`}
                      onClick={() => setIsOpen(false)}
                      className="relative w-18 h-20 flex-shrink-0 overflow-hidden bg-[#EBE7DB] block"
                      style={{ width: "72px" }}
                    >
                      <RemoteImage
                        src={item.thumbnail || "/placeholder.svg"}
                        alt={item.productName}
                        fill
                        className="object-cover"
                        sizes="72px"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[12px] tracking-[0.1em] uppercase font-sans text-[#2A2726] leading-tight truncate">
                            {item.productName}
                          </p>
                          <p className="text-[11px] text-[#7A756E] mt-0.5 tracking-[0.06em]">
                            {item.variantLabel}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.variantId)}
                          className="shrink-0 text-[#D4CFC5] hover:text-[#5C1A24] boty-transition"
                          aria-label="Quitar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="inline-flex items-center border border-[#D4CFC5]">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center text-[#7A756E] hover:text-[#2A2726] border-r border-[#D4CFC5] boty-transition"
                            aria-label="Menos"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center text-[12px] font-sans text-[#2A2726]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                            disabled={item.quantity >= (item.maxQuantity ?? MAX_CART_LINE_QUANTITY)}
                            className="w-7 h-7 flex items-center justify-center text-[#7A756E] hover:text-[#2A2726] border-l border-[#D4CFC5] boty-transition disabled:opacity-40"
                            aria-label="Más"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-[12px] font-sans text-[#2A2726]">
                          {formatMxn(Number.parseFloat(item.retailPriceMxn) * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Out-of-stock items */}
              {outOfStockItems.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#5C1A24]/20">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-[#5C1A24] mb-3">
                    SIN EXISTENCIAS — no se incluirán en tu pedido
                  </p>
                  {outOfStockItems.map((item) => (
                    <div key={item.variantId} className="py-3 flex gap-3 opacity-50">
                      <div className="relative w-14 h-14 flex-shrink-0 overflow-hidden bg-[#EBE7DB]">
                        <RemoteImage
                          src={item.thumbnail || "/placeholder.svg"}
                          alt={item.productName}
                          fill
                          className="object-cover grayscale"
                          sizes="56px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] tracking-[0.08em] uppercase font-sans text-[#2A2726] truncate">
                          {item.productName}
                        </p>
                        <p className="text-[10px] text-[#7A756E]">{item.variantLabel}</p>
                        <span className="text-[10px] tracking-[0.15em] uppercase text-[#5C1A24]">
                          AGOTADO
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.variantId)}
                        className="shrink-0 text-[#D4CFC5] hover:text-[#5C1A24] boty-transition"
                        aria-label="Quitar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <DrawerFooter className="border-t border-[#D4CFC5] px-6 py-5 shrink-0 gap-3 bg-[#F5F0E6]">
            <div className="space-y-2 text-[12px] mb-2">
              <div className="flex justify-between text-[#7A756E]">
                <span className="tracking-[0.12em] uppercase">
                  Subtotal ({itemCount} {itemCount === 1 ? "artículo" : "artículos"})
                </span>
                <span>{formatMxn(subtotal)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-[#D4CFC5] text-[#2A2726]">
                <span className="tracking-[0.12em] uppercase font-sans">Total estimado</span>
                <span className="tracking-[0.06em]">{formatMxn(subtotal)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              onClick={() => setIsOpen(false)}
              className="w-full block text-center bg-[#5C1A24] text-[#f8f9fa] py-4 text-[11px] tracking-[0.22em] uppercase hover:bg-[#4A1520] boty-transition"
            >
              FINALIZAR COMPRA
            </Link>
            <DrawerClose asChild>
              <button
                type="button"
                className="w-full border border-[#D4CFC5] text-[#2A2726] py-3 text-[11px] tracking-[0.18em] uppercase hover:bg-[#EBE7DB] boty-transition"
              >
                SEGUIR COMPRANDO
              </button>
            </DrawerClose>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
