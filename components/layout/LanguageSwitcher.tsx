"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/app/actions/set-locale";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/locale";

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common.languageSwitcher");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale || isPending) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={cn("flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase", className)}
    >
      <button
        type="button"
        onClick={() => choose("es")}
        aria-current={locale === "es"}
        className={cn("boty-transition", locale === "es" ? "opacity-100" : "opacity-40 hover:opacity-70")}
      >
        ES
      </button>
      <span aria-hidden="true" className="opacity-40">
        |
      </span>
      <button
        type="button"
        onClick={() => choose("en")}
        aria-current={locale === "en"}
        className={cn("boty-transition", locale === "en" ? "opacity-100" : "opacity-40 hover:opacity-70")}
      >
        EN
      </button>
    </div>
  );
}
