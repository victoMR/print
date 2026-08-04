"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  LANGUAGE_COOKIE,
  LANGUAGE_COOKIE_MAX_AGE,
  type Language,
} from "@/lib/i18n/locale";
import { useLanguage } from "@/lib/i18n/language-context";

function setLanguageCookie(language: Language) {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LANGUAGE_COOKIE}=${language}; Path=/; Max-Age=${LANGUAGE_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

/** Cambia solo el idioma de la UI — no cambia mercado ni moneda. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const language = useLanguage();
  const t = useTranslations("common.languageSwitcher");
  const router = useRouter();

  function choose(next: Language) {
    if (next === language) return;
    setLanguageCookie(next);
    router.refresh();
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
        aria-current={language === "es"}
        className={cn("boty-transition", language === "es" ? "opacity-100" : "opacity-40 hover:opacity-70")}
      >
        ES
      </button>
      <span aria-hidden="true" className="opacity-40">
        |
      </span>
      <button
        type="button"
        onClick={() => choose("en")}
        aria-current={language === "en"}
        className={cn("boty-transition", language === "en" ? "opacity-100" : "opacity-40 hover:opacity-70")}
      >
        EN
      </button>
    </div>
  );
}
