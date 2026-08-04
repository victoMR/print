"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE_MANUAL,
  type Locale,
} from "@/lib/i18n/locale";

function setMarketCookie(market: Locale) {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${market}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE_MANUAL}; SameSite=Lax${secure}`;
}

/** Cambia el mercado (/mx ↔ /us) — moneda y precios. No cambia el idioma. */
export function MarketSwitcher({ className }: { className?: string }) {
  const market = useLocale() as Locale;
  const t = useTranslations("common.marketSwitcher");
  const pathname = usePathname();
  const router = useRouter();

  function choose(next: Locale) {
    if (next === market) return;
    setMarketCookie(next);
    router.replace(pathname, { locale: next });
  }

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={cn("flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase", className)}
    >
      <button
        type="button"
        onClick={() => choose("mx")}
        aria-current={market === "mx"}
        className={cn("boty-transition", market === "mx" ? "opacity-100" : "opacity-40 hover:opacity-70")}
      >
        MX
      </button>
      <span aria-hidden="true" className="opacity-40">
        |
      </span>
      <button
        type="button"
        onClick={() => choose("us")}
        aria-current={market === "us"}
        className={cn("boty-transition", market === "us" ? "opacity-100" : "opacity-40 hover:opacity-70")}
      >
        US
      </button>
    </div>
  );
}
