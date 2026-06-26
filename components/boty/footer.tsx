"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";

const footerColumns = [
  {
    title: "TIENDA",
    links: [
      { name: "TODOS LOS PRODUCTOS", href: "/shop" },
      { name: "PLAYERAS", href: "/shop" },
      { name: "SUDADERAS", href: "/shop" },
      { name: "PANTALONES", href: "/shop" },
      { name: "ACCESORIOS", href: "/shop" },
    ],
  },
  {
    title: "COLECCIONES",
    links: [
      { name: "ACTUAL", href: "/shop" },
      { name: "ARCHIVO", href: "/" },
      { name: "PRÓXIMAMENTE", href: "/" },
    ],
  },
  {
    title: "INFORMACIÓN",
    links: [
      { name: "ENVÍOS Y DEVOLUCIONES", href: "/" },
      { name: "TÉRMINOS Y CONDICIONES", href: "/terminos" },
      { name: "PRIVACIDAD", href: "/privacidad" },
      { name: "FAQ", href: "/" },
    ],
  },
  {
    title: "CONTACTO",
    links: [
      { name: "CONTACTO", href: "/" },
      { name: "WHATSAPP", href: "/" },
    ],
  },
];

const socialLinks = [
  { name: "INSTAGRAM", href: "/" },
  { name: "TIKTOK", href: "/" },
  { name: "YOUTUBE", href: "/" },
  { name: "EMAIL", href: "/" },
];

type FooterProps = {
  variant?: "full" | "compact";
};

export function Footer({ variant = "full" }: FooterProps) {
  const isFull = variant === "full";

  return (
    <footer
      className={cn(
        "w-full bg-[#1E5A43] text-[#f8f9fa]",
        isFull ? "pt-16 md:pt-20 pb-10 md:pb-12" : "pt-10 pb-8",
      )}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {isFull ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 mb-12">
              {/* Left: Logo + columns */}
              <div className="grid grid-cols-2 sm:grid-cols-[auto_1fr_1fr_1fr_1fr] gap-8 sm:gap-10">
                {/* Logo block */}
                <div className="col-span-2 sm:col-span-1 sm:pr-8 sm:border-r sm:border-[#f8f9fa]/20">
                  <Link href="/" className="block mb-4">
                    <Logo color="#f8f9fa" className="w-32" />
                  </Link>
                  <p className="text-[10px] tracking-[0.1em] text-[#f8f9fa]/50 uppercase">
                    © MR. PAPS 2024.<br />TODOS LOS DERECHOS RESERVADOS.
                  </p>
                </div>

                {/* Link columns */}
                {footerColumns.map((col) => (
                  <FooterColumn key={col.title} title={col.title} links={col.links} />
                ))}
              </div>

              {/* Right: social divider */}
              <div className="flex flex-row lg:flex-col lg:pl-10 lg:border-l lg:border-[#f8f9fa]/20 gap-4 lg:gap-3">
                {socialLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="text-[10px] tracking-[0.18em] uppercase text-[#f8f9fa]/70 hover:text-[#f8f9fa] boty-transition"
                  >
                    {link.name}
                  </a>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/">
              <Logo color="#f8f9fa" className="w-24" />
            </Link>
            <p className="text-[10px] tracking-[0.1em] text-[#f8f9fa]/50 uppercase">
              © MR. PAPS 2024. TODOS LOS DERECHOS RESERVADOS.
            </p>
          </div>
        )}
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
      <h3 className="text-[10px] tracking-[0.22em] uppercase text-[#f8f9fa] mb-4 font-sans">
        {title}
      </h3>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.name}>
            <Link
              href={link.href}
              className="text-[10px] tracking-[0.15em] uppercase text-[#f8f9fa]/60 hover:text-[#f8f9fa] boty-transition"
            >
              {link.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
