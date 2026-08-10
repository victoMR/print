"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { customerRegister } from "@/lib/customer-api";
import { apiErrorMessage } from "@/lib/i18n/api-error-message";
import {
  CUSTOMER_PASSWORD_MIN,
  normalizeRegisterPayload,
  validateRegisterForm,
} from "@/lib/customer-auth-rules";
import { LegalConsentCheckbox } from "@/components/legal/legal-consent-checkbox";
import { AuthCard, AuthShell } from "./auth-shell";
import { BotyAlert, BotyButton, BotyInput, BotyLabel } from "./ui-patterns";

function buildAuthHref(path: string, redirect: string) {
  const q = redirect && redirect !== path ? `?redirect=${encodeURIComponent(redirect)}` : "";
  return `${path}${q}`;
}

export function RegisterForm() {
  const t = useTranslations("auth");
  const tRoot = useTranslations();
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phone: "",
    acceptedLegal: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const redirect = params.get("redirect") ?? "/cuenta";
  const loginHref = buildAuthHref("/login", redirect);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const validationError = validateRegisterForm(form, (key, values) => t(`errors.${key}`, values));
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    try {
      const result = await customerRegister(normalizeRegisterPayload(form));
      router.push(`/registro/verificar?email=${encodeURIComponent(result.email)}`);
    } catch (err) {
      setError(apiErrorMessage(err, tRoot, t("errors.registerFailed")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell variant="customer">
      <AuthCard>
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl mb-2">{t("register.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("register.subtitle")}</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" autoComplete="on">
          {error && <BotyAlert variant="error">{error}</BotyAlert>}

          <label className="flex flex-col gap-2">
            <BotyLabel>{t("register.fullName")}</BotyLabel>
            <BotyInput
              required
              autoComplete="name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-2">
            <BotyLabel>{t("fields.email")}</BotyLabel>
            <BotyInput
              required
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-2">
            <BotyLabel>{t("register.phone")} <span className="font-normal text-muted-foreground">({t("register.optional")})</span></BotyLabel>
            <BotyInput
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>

          <PasswordRow
            label={t("fields.password")}
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
            show={showPassword}
            onToggle={() => setShowPassword((s) => !s)}
            hint={t("register.passwordHint", { min: CUSTOMER_PASSWORD_MIN })}
            showLabel={t("showPassword")}
            hideLabel={t("hidePassword")}
          />

          <PasswordRow
            label={t("register.confirmPassword")}
            value={form.confirmPassword}
            onChange={(v) => setForm({ ...form, confirmPassword: v })}
            show={showConfirm}
            onToggle={() => setShowConfirm((s) => !s)}
            showLabel={t("showPassword")}
            hideLabel={t("hidePassword")}
          />

          <LegalConsentCheckbox
            id="register-legal-consent"
            checked={form.acceptedLegal}
            onChange={(acceptedLegal) => setForm({ ...form, acceptedLegal })}
            disabled={busy}
          />

          <BotyButton
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            disabled={busy || !form.acceptedLegal}
          >
            {busy ? t("register.creating") : t("register.submit")}
          </BotyButton>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-8 pt-6 border-t border-border/50">
          {t("register.alreadyHaveAccount")}{" "}
          <Link href={loginHref} className="text-primary font-medium hover:underline">
            {t("login.submit")}
          </Link>
        </p>
      </AuthCard>
    </AuthShell>
  );
}

function PasswordRow({
  label,
  value,
  onChange,
  show,
  onToggle,
  hint,
  showLabel,
  hideLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  hint?: string;
  showLabel: string;
  hideLabel: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <BotyLabel>{label}</BotyLabel>
      <div className="relative">
        <BotyInput
          required
          type={show ? "text" : "password"}
          autoComplete="new-password"
          minLength={CUSTOMER_PASSWORD_MIN}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-12"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground"
          aria-label={show ? hideLabel : showLabel}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
