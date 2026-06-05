"use client";

import Link from "next/link";
import { Instagram, Facebook, Twitter } from "lucide-react";
import { cn } from "@/lib/utils";

const footerLinks = {
  shop: [
    { name: "Todos los productos", href: "/shop" },
    { name: "Checkout", href: "/checkout" },
    { name: "Mi cuenta", href: "/cuenta" },
  ],
  about: [
    { name: "Inicio", href: "/" },
    { name: "Tienda", href: "/shop" },
    { name: "Términos y condiciones", href: "/terminos" },
    { name: "Aviso de privacidad", href: "/privacidad" },
  ],
  support: [
    { name: "Contacto", href: "/" },
    { name: "Preguntas Frecuentes", href: "/" },
    { name: "Envíos", href: "/" },
    { name: "Devoluciones", href: "/" },
  ],
};

type FooterProps = {
  /** compact = auth y páginas secundarias; full = tienda y home */
  variant?: "full" | "compact";
};

export function Footer({ variant = "full" }: FooterProps) {
  const isFull = variant === "full";

  return (
    <footer
      className={cn(
        "w-full shrink-0 bg-primary text-white relative overflow-hidden",
        isFull ? "pt-16 md:pt-20 pb-10 md:pb-12 min-h-[420px]" : "pt-12 pb-8",
      )}
    >
      {isFull && (
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none select-none z-0 w-full flex justify-center"
          aria-hidden
        >
          <span className="font-serif font-bold text-white/15 whitespace-nowrap leading-none text-[min(28vw,180px)] md:text-[min(32vw,320px)]">
            Mr. Paps
          </span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div
          className={cn(
            "grid gap-10 mb-12",
            isFull
              ? "grid-cols-2 md:grid-cols-4"
              : "grid-cols-1 sm:grid-cols-2 md:grid-cols-4",
          )}
        >
          <div className={cn(isFull ? "col-span-2 md:col-span-1" : "sm:col-span-2 md:col-span-1")}>
            <Link href="/" className="font-serif text-3xl text-white hover:opacity-90 boty-transition">
              Mr. Paps
            </Link>
            <p className="text-sm text-white/80 leading-relaxed mt-3 mb-5 max-w-xs">
              Tu tienda de ropa personalizada con impresión bajo demanda. Diseña, imprime, viste.
            </p>
            <div className="flex gap-3">
              <SocialIcon href="https://x.com/Kerroudjm" label="Instagram">
                <Instagram className="w-4 h-4" />
              </SocialIcon>
              <SocialIcon href="https://x.com/Kerroudjm" label="Facebook">
                <Facebook className="w-4 h-4" />
              </SocialIcon>
              <SocialIcon href="https://x.com/Kerroudjm" label="Twitter">
                <Twitter className="w-4 h-4" />
              </SocialIcon>
            </div>
          </div>

          <FooterColumn title="Tienda" links={footerLinks.shop} />
          <FooterColumn title="Nosotros" links={footerLinks.about} />
          <FooterColumn title="Soporte" links={footerLinks.support} />
        </div>

        <div className="pt-8 border-t border-white/20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/60">
              © {new Date().getFullYear()} Mr. Paps. Todos los derechos reservados.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <Link href="/privacidad" className="text-sm text-white/60 hover:text-white boty-transition">
                Aviso de privacidad
              </Link>
              <Link href="/shop" className="text-sm text-white/60 hover:text-white boty-transition">
                Tienda
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { name: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="font-medium text-white mb-4">{title}</h3>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.name}>
            <Link
              href={link.href}
              className="text-sm text-white/75 hover:text-white boty-transition"
            >
              {link.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 boty-transition"
      aria-label={label}
    >
      {children}
    </a>
  );
}
