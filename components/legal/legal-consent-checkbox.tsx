"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

type LegalConsentCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
};

export function LegalConsentCheckbox({
  checked,
  onChange,
  disabled,
  className,
  id = "legal-consent",
}: LegalConsentCheckboxProps) {
  const t = useTranslations("legalConsent");
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 cursor-pointer",
        disabled && "opacity-60 cursor-not-allowed",
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary/30"
        required
      />
      <span className="text-sm text-foreground/90 leading-relaxed">
        {t("prefix")}{" "}
        <Link href="/terminos" target="_blank" className="text-primary font-medium hover:underline">
          {t("terms")}
        </Link>{" "}
        {t("and")}{" "}
        <Link href="/privacidad" target="_blank" className="text-primary font-medium hover:underline">
          {t("privacy")}
        </Link>
        .
      </span>
    </label>
  );
}
