"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { customerLogin, CustomerApiError } from "@/lib/customer-api";
import { apiErrorMessage } from "@/lib/i18n/api-error-message";
import { validateLoginForm } from "@/lib/customer-auth-rules";
import { useCustomer } from "@/lib/customer-context";
import { broadcastSession } from "@/lib/session-broadcast";
import { ADMIN_LOGIN_PATH, isAdminPath, safeRedirectPath } from "@/lib/safe-redirect";
import { AuthCard, AuthShell } from "./auth-shell";
import { BotyAlert, BotyButton, BotyInput, BotyLabel } from "./ui-patterns";

function buildAuthHref(path: string, redirect: string) {
  const q = redirect && redirect !== path ? `?redirect=${encodeURIComponent(redirect)}` : "";
  return `${path}${q}`;
}

export function LoginForm() {
  const t = useTranslations("auth");
  const tRoot = useTranslations();
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useCustomer();
  const [form, setForm] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [busy, setBusy] = useState(false);

  const redirect = safeRedirectPath(params.get("redirect"), "/cuenta");
  const registerHref = buildAuthHref("/registro", redirect);

  // Si el destino es el panel admin, usar el login de admin (no el de clientes).
  useEffect(() => {
    if (isAdminPath(redirect)) {
      router.replace(
        `${ADMIN_LOGIN_PATH}?redirect=${encodeURIComponent(redirect)}`,
      );
    }
  }, [redirect, router]);

  if (isAdminPath(redirect)) {
    return (
      <p className="text-center py-20 text-muted-foreground text-sm">
        {t("redirectingToAdmin")}
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    const validationError = validateLoginForm(form.email, form.password, (key, values) =>
      t(`errors.${key}`, values),
    );
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    try {
      await customerLogin(form.email.trim().toLowerCase(), form.password, rememberMe);
      await refresh();
      broadcastSession({ type: "customer:login" });
      router.push(redirect);
    } catch (err) {
      if (err instanceof CustomerApiError && err.code === "EMAIL_NOT_VERIFIED") {
        setError(t("errors.emailNotVerified"));
        setNeedsVerification(true);
      } else {
        setError(apiErrorMessage(err, tRoot, t("errors.loginFailed")));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell variant="customer">
      <AuthCard>
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl mb-2">{t("login.welcomeBack")}</h1>
          <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5" autoComplete="on">
          {error && <BotyAlert variant="error">{error}</BotyAlert>}

          <label className="flex flex-col gap-2">
            <BotyLabel>{t("fields.email")}</BotyLabel>
            <BotyInput
              required
              type="email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-2">
            <BotyLabel>{t("fields.password")}</BotyLabel>
            <div className="relative">
              <BotyInput
                required
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <span className="text-sm text-muted-foreground">{t("login.rememberMe")}</span>
          </label>

          <BotyButton type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
            {busy ? t("login.signingIn") : t("login.submit")}
          </BotyButton>
        </form>

        {needsVerification && (
          <p className="text-center text-sm mt-4">
            <Link
              href={`/registro/verificar?email=${encodeURIComponent(form.email.trim().toLowerCase())}`}
              className="text-primary font-medium hover:underline"
            >
              {t("resendVerification")}
            </Link>
          </p>
        )}

        <p className="text-center text-sm text-muted-foreground mt-8 pt-6 border-t border-border/50">
          {t("login.firstTime")}{" "}
          <Link href={registerHref} className="text-primary font-medium hover:underline">
            {t("login.createFree")}
          </Link>
        </p>
      </AuthCard>
    </AuthShell>
  );
}
