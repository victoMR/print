"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ShoppingBag } from "lucide-react";
import { CartDrawer } from "./cart-drawer";
import { useCart } from "@/lib/cart-context";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";

const navLinks = [
  { label: "SHOP", href: "/shop" },
  { label: "COLECCIONES", href: "/shop" },
  { label: "ABOUT", href: "/" },
  { label: "JOURNAL", href: "/" },
  { label: "CONTACTO", href: "/" },
];

export function Header({ className }: { className?: string }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { setIsOpen, itemCount } = useCart();
  const pathname = usePathname();

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        className,
      )}
    >
      {/* Announcement bar */}
      <div className="bg-[#5C1A24] text-[#f8f9fa] text-center py-2.5">
        <p className="text-[10px] tracking-[0.22em] uppercase font-sans">
          ENVÍOS A TODO MÉXICO Y ESTADOS UNIDOS.
        </p>
      </div>

      {/* Main nav */}
      <nav className="bg-[#F5F0E6] border-b border-[#D4CFC5]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-[60px]">

          {/* Logo */}
          <Link href="/" className="shrink-0">
            <Logo color="#2A2726" className="w-28 sm:w-32" />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  "text-[11px] tracking-[0.18em] uppercase boty-transition",
                  pathname === link.href
                    ? "text-[#2A2726]"
                    : "text-[#2A2726]/60 hover:text-[#2A2726]",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-5">
            <span className="hidden sm:block text-[10px] tracking-[0.18em] text-[#2A2726]/50 uppercase">
              MEX | EN
            </span>

            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="relative text-[#2A2726]/70 hover:text-[#2A2726] boty-transition flex items-center gap-1.5"
              aria-label="Carrito"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="text-[11px] tracking-[0.12em] uppercase hidden sm:block">
                CART ({itemCount})
              </span>
              {itemCount > 0 && (
                <span className="sm:hidden absolute -top-1 -right-1 w-4 h-4 bg-[#5C1A24] text-[#f8f9fa] text-[9px] flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Mobile hamburger */}
            <button
              type="button"
              className="lg:hidden p-1 text-[#2A2726]/70 hover:text-[#2A2726] boty-transition"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={cn(
            "lg:hidden overflow-hidden boty-transition border-t border-[#D4CFC5]",
            isMenuOpen ? "max-h-80" : "max-h-0",
          )}
        >
          <div className="flex flex-col px-6 py-4 gap-4 bg-[#F5F0E6]">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[11px] tracking-[0.2em] uppercase text-[#2A2726]/70 hover:text-[#2A2726] boty-transition py-1"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <CartDrawer />
    </header>
  );
}
