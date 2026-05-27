"use client";

import { CartButton } from "@/components/cart/CartButton";
import { CartProvider } from "@/lib/cart-context";
import { GlassNavInner } from "@/components/layout/GlassNavInner";
import { PageBackground } from "@/components/layout/PageBackground";
import { SiteFooter } from "@/components/layout/SiteFooter";
import type { ReactNode } from "react";

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <CartProvider>
      <PageBackground>
        <GlassNavInner cartSlot={<CartButton />} />
        <main className="pt-24">{children}</main>
        <SiteFooter />
      </PageBackground>
    </CartProvider>
  );
}
