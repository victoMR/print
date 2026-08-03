"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/locale";

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common.languageSwitcher");
  const pathname = usePathname();
  const router = useRouter();

  function choose(next: Locale) {
    if (next === locale) return;
    // Real navigation between markets (e.g. /mx/shop -> /us/shop), not just a
    // cookie flip — the switcher moves you to the other market's version of
    // the same page. Currency/shipping still get verified server-side against
    // your real location at checkout regardless of which market you're browsing.
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
        aria-current={locale === "mx"}
        className={cn("boty-transition", locale === "mx" ? "opacity-100" : "opacity-40 hover:opacity-70")}
      >
        ES
      </button>
      <span aria-hidden="true" className="opacity-40">
        |
      </span>
      <button
        type="button"
        onClick={() => choose("us")}
        aria-current={locale === "us"}
        className={cn("boty-transition", locale === "us" ? "opacity-100" : "opacity-40 hover:opacity-70")}
      >
        EN
      </button>
    </div>
  );
}
