"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useCookieConsent } from "@/lib/cookie-consent-context";

export function CookieConsentBanner() {
  const t = useTranslations("cookieConsent");
  const { consent, acceptAll, acceptEssential } = useCookieConsent();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show banner only after hydration and only if no decision has been made
    if (consent === null) {
      // Small delay to avoid flash on fast loads
      const t = window.setTimeout(() => setVisible(true), 600);
      return () => window.clearTimeout(t);
    }
    setVisible(false);
  }, [consent]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t("ariaLabel")}
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#2A2726] text-[#F5F0E6] px-5 py-4 md:px-8 md:py-5"
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-[13px] leading-relaxed flex-1 text-[#F5F0E6]/80">
          {t("message")}{" "}
          <a
            href="/privacidad"
            className="underline text-[#F5F0E6] hover:opacity-70"
          >
            {t("privacyLink")}
          </a>
          .
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            type="button"
            onClick={acceptEssential}
            className="text-[11px] tracking-[0.15em] uppercase px-4 py-2.5 border border-[#F5F0E6]/30 text-[#F5F0E6]/70 hover:border-[#F5F0E6]/60 hover:text-[#F5F0E6] transition-colors"
          >
            {t("essentialOnly")}
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="text-[11px] tracking-[0.15em] uppercase px-4 py-2.5 bg-[#F5F0E6] text-[#2A2726] hover:bg-white transition-colors"
          >
            {t("acceptAll")}
          </button>
        </div>
      </div>
    </div>
  );
}
