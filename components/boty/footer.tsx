"use client";

import { Link } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { MarketSwitcher } from "@/components/layout/MarketSwitcher";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_CONTACT_MAILTO,
  SITE_INSTAGRAM_URL,
  SITE_WHATSAPP_URL,
} from "@/lib/legal/config";

type FooterProps = {
  variant?: "full" | "compact";
};

export function Footer({ variant = "full" }: FooterProps) {
  const t = useTranslations("layout.footer");
  const isFull = variant === "full";

  const footerColumns = [
    {
      title: t("shop.title"),
      links: [
        { name: t("shop.all"), href: "/shop" },
        { name: t("shop.tshirts"), href: "/shop" },
        { name: t("shop.hoodies"), href: "/shop" },
        { name: t("shop.pants"), href: "/shop" },
        { name: t("shop.accessories"), href: "/shop" },
      ],
    },
    {
      title: t("collections.title"),
      links: [
        { name: t("collections.current"), href: "/shop" },
        { name: t("collections.archive"), href: "/", disabled: true },
        { name: t("collections.comingSoon"), href: "/", disabled: true },
      ],
    },
    {
      title: t("info.title"),
      links: [
        { name: t("info.about"), href: "/nosotros" },
        { name: t("info.shippingReturns"), href: "/envios-y-devoluciones" },
        { name: t("info.terms"), href: "/terminos" },
        { name: t("info.privacy"), href: "/privacidad" },
      ],
    },
    {
      title: t("contact.title"),
      links: [
        { name: "WhatsApp", href: SITE_WHATSAPP_URL, external: true },
        { name: LEGAL_CONTACT_EMAIL, href: LEGAL_CONTACT_MAILTO, external: true },
      ],
    },
  ];

  const socialLinks = [
    { name: "Instagram", href: SITE_INSTAGRAM_URL, external: true },
    { name: "WhatsApp", href: SITE_WHATSAPP_URL, external: true },
    { name: t("email"), href: LEGAL_CONTACT_MAILTO, external: true },
  ];

  return (
    <footer
      className={cn(
        "w-full bg-[#5C1A24] text-[#f8f9fa]",
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
                    © Mr. Paps 2024.<br />{t("allRightsReserved")}
                  </p>
                </div>

                {/* Link columns */}
                {footerColumns.map((col) => (
                  <FooterColumn key={col.title} title={col.title} links={col.links} />
                ))}
              </div>

              {/* Right: social divider */}
              <div className="relative z-[51] flex flex-row lg:flex-col lg:pl-10 lg:border-l lg:border-[#f8f9fa]/20 gap-4 lg:gap-3">
                {socialLinks.map((link) => (
                  <FooterExternalLink
                    key={link.name}
                    href={link.href}
                    className="text-[10px] tracking-[0.18em] uppercase text-[#f8f9fa]/70 hover:text-[#f8f9fa] boty-transition"
                  >
                    {link.name}
                  </FooterExternalLink>
                ))}
                <div className="flex flex-col gap-2">
                  <MarketSwitcher className="text-[#f8f9fa]/70" />
                  <LanguageSwitcher className="text-[#f8f9fa]/70" />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/">
              <Logo color="#f8f9fa" className="w-24" />
            </Link>
            <p className="text-[10px] tracking-[0.1em] text-[#f8f9fa]/50 uppercase">
              © Mr. Paps 2024. {t("allRightsReserved")}
            </p>
            <div className="flex items-center gap-3 text-[#f8f9fa]/70">
              <MarketSwitcher />
              <span aria-hidden="true" className="opacity-30">
                ·
              </span>
              <LanguageSwitcher />
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}

function FooterExternalLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const isMailto = href.startsWith("mailto:");

  if (isMailto) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { name: string; href: string; external?: boolean; disabled?: boolean }[];
}) {
  return (
    <div>
      <h3 className="text-[10px] tracking-[0.22em] uppercase text-[#f8f9fa] mb-4 font-sans">
        {title}
      </h3>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.name}>
            {link.disabled ? (
              <span className="text-[10px] tracking-[0.15em] uppercase text-[#f8f9fa]/25 cursor-default">
                {link.name}
              </span>
            ) : link.external ? (
              <FooterExternalLink
                href={link.href}
                className="text-[10px] tracking-[0.15em] uppercase text-[#f8f9fa]/60 hover:text-[#f8f9fa] boty-transition"
              >
                {link.name}
              </FooterExternalLink>
            ) : (
              <Link
                href={link.href}
                className="text-[10px] tracking-[0.15em] uppercase text-[#f8f9fa]/60 hover:text-[#f8f9fa] boty-transition"
              >
                {link.name}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
