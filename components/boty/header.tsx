"use client";

import { useState, useEffect } from "react";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import { Menu, X, ShoppingBag } from "lucide-react";
import { CartDrawer } from "./cart-drawer";
import { useCart } from "@/lib/cart-context";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { MarketSwitcher } from "@/components/layout/MarketSwitcher";
import { SITE_WHATSAPP_URL } from "@/lib/legal/config";

export function Header({ className, alwaysVisible = false }: { className?: string; alwaysVisible?: boolean }) {
  const t = useTranslations("layout.header");
  const navLinks = [
    { label: t("nav.collections"), href: "/shop" },
    { label: t("nav.about"), href: "/nosotros" },
    { label: t("nav.contact"), href: SITE_WHATSAPP_URL, external: true },
  ] as const;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { setIsOpen, itemCount } = useCart();
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const visible = alwaysVisible || scrolled;

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-transform duration-500 ease-out",
        visible ? "translate-y-0" : "-translate-y-full",
        className,
      )}
    >
      {/* Announcement bar */}
      <div className="bg-[#5C1A24] text-[#f8f9fa] text-center py-2.5">
        <p className="text-[10px] tracking-[0.22em] uppercase font-sans">
          {t("announcement")}
        </p>
      </div>

      {/* Main nav */}
      <nav className="bg-[#F5F0E6] border-b border-[#D4CFC5]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-[80px]">

          {/* Logo */}
          <Link href="/" className="shrink-0">
            <Logo color="#2A2726" className="w-28 sm:w-32" />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) =>
              "external" in link && link.external ? (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-[11px] tracking-[0.18em] uppercase boty-transition text-[#2A2726]/60 hover:text-[#2A2726]"
                >
                  {link.label}
                </a>
              ) : (
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
              ),
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-5">
            <div className="hidden sm:flex items-center gap-3 text-[#2A2726]/50">
              <MarketSwitcher />
              <span aria-hidden="true" className="opacity-30">
                ·
              </span>
              <LanguageSwitcher />
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="relative text-[#2A2726]/70 hover:text-[#2A2726] boty-transition flex items-center gap-1.5"
              aria-label={t("cart")}
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="text-[11px] tracking-[0.12em] uppercase hidden sm:block">
                {t("cartWithCount", { count: itemCount })}
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
              aria-label={t("toggleMenu")}
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
            {navLinks.map((link) =>
              "external" in link && link.external ? (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-[11px] tracking-[0.2em] uppercase text-[#2A2726]/70 hover:text-[#2A2726] boty-transition py-1"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-[11px] tracking-[0.2em] uppercase text-[#2A2726]/70 hover:text-[#2A2726] boty-transition py-1"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ),
            )}
            <div className="flex items-center gap-3 pt-2 border-t border-[#D4CFC5] text-[#2A2726]/50">
              <MarketSwitcher />
              <span aria-hidden="true" className="opacity-30">
                ·
              </span>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </nav>

      <CartDrawer />
    </header>
  );
}
