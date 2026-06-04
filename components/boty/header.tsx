"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ShoppingBag, User, LogIn } from "lucide-react";
import { CartDrawer } from "./cart-drawer";
import { useCart } from "@/lib/cart-context";
import { useCustomer } from "@/lib/customer-context";
import { cn } from "@/lib/utils";

export function Header({ className }: { className?: string }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { setIsOpen, itemCount } = useCart();
  const { user, loading } = useCustomer();
  const pathname = usePathname();

  const accountHref = user ? "/cuenta" : `/login?redirect=${pathname}`;
  const accountLabel = user ? user.fullName.split(" ")[0] : "Entrar";
  const AccountIcon = user ? User : LogIn;

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-4 pt-[max(1rem,env(safe-area-inset-top))]",
        className,
      )}
    >
      <nav
        className="max-w-7xl mx-auto px-6 lg:px-8 backdrop-blur-md rounded-lg py-0 my-0 animate-scale-fade-in bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.32)]"
        style={{ boxShadow: "rgba(0, 0, 0, 0.1) 0px 10px 50px" }}
      >
        <div className="flex items-center justify-between h-[68px]">
          <button
            type="button"
            className="lg:hidden p-2 text-foreground/80 hover:text-foreground boty-transition"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="hidden lg:flex items-center gap-8">
            <Link href="/shop" className="text-sm tracking-wide text-foreground/70 hover:text-foreground boty-transition">
              Shop
            </Link>
            <Link href="/seguimiento" className="text-sm tracking-wide text-foreground/70 hover:text-foreground boty-transition">
              Seguimiento
            </Link>
            <Link href="/" className="text-sm tracking-wide text-foreground/70 hover:text-foreground boty-transition">
              About
            </Link>
          </div>

          <Link href="/" className="absolute left-1/2 -translate-x-1/2">
            <h1 className="font-serif text-3xl tracking-wider text-foreground">Mr. Paps</h1>
          </Link>

          <div className="flex items-center gap-3">
            {/* Account / Login */}
            {!loading && (
              <Link
                href={accountHref}
                className="hidden sm:flex items-center gap-1.5 p-2 text-foreground/70 hover:text-foreground boty-transition text-sm"
                aria-label={accountLabel}
              >
                <AccountIcon className="w-5 h-5" />
                <span className="hidden md:inline">{accountLabel}</span>
              </Link>
            )}

            {/* Cart */}
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="relative p-2 text-foreground/70 hover:text-foreground boty-transition"
              aria-label="Carrito"
            >
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-0 -right-0 w-4 h-4 bg-primary text-primary-foreground text-[10px] flex items-center justify-center rounded-full">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <CartDrawer />

        {/* Mobile menu */}
        <div className={`lg:hidden overflow-hidden boty-transition ${isMenuOpen ? "max-h-64 pb-6" : "max-h-0"}`}>
          <div className="flex flex-col gap-4 pt-4 border-t border-border/50">
            <Link href="/shop" className="text-sm text-foreground/70 hover:text-foreground boty-transition" onClick={() => setIsMenuOpen(false)}>Shop</Link>
            <Link href="/seguimiento" className="text-sm text-foreground/70 hover:text-foreground boty-transition" onClick={() => setIsMenuOpen(false)}>Seguimiento</Link>
            <Link href="/" className="text-sm text-foreground/70 hover:text-foreground boty-transition" onClick={() => setIsMenuOpen(false)}>About</Link>
            <Link href={accountHref} className="text-sm text-foreground/70 hover:text-foreground boty-transition" onClick={() => setIsMenuOpen(false)}>
              {user ? "Mi cuenta" : "Iniciar sesión"}
            </Link>
            {!user && (
              <Link href="/registro" className="text-sm text-foreground/70 hover:text-foreground boty-transition" onClick={() => setIsMenuOpen(false)}>
                Crear cuenta
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
