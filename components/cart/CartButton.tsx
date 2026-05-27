"use client";

import { useCart } from "@/lib/cart-context";
import Link from "next/link";

export function CartButton() {
  const { count } = useCart();

  return (
    <Link
      href="/carrito"
      className="relative rounded-full px-3 py-1.5 text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
    >
      Carrito
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 px-1 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
