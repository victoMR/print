"use client";

import { Suspense, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { verifyCustomerEmail } from "@/lib/customer-api";
import { apiErrorMessage } from "@/lib/i18n/api-error-message";
import { AuthCard, AuthShell } from "@/components/boty/auth-shell";
import { BotyButton } from "@/components/boty/ui-patterns";

function VerifyEmailContent() {
  const t = useTranslations("emailVerification");
  const tRoot = useTranslations();
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage(t("linkIncomplete"));
      return;
    }

    let cancelled = false;
    verifyCustomerEmail(token)
      .then(() => {
        if (cancelled) return;
        setStatus("success");
        setMessage(t("verifiedFallbackMessage"));
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("error");
        setMessage(apiErrorMessage(err, tRoot, t("verifyErrorFallback")));
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable per locale
  }, [token]);

  return (
    <AuthShell variant="customer">
      <AuthCard>
        <div className="text-center space-y-4 py-4">
          {status === "loading" && (
            <>
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground text-sm">{t("verifying")}</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h1 className="font-serif text-2xl">{t("verifiedTitle")}</h1>
              <p className="text-sm text-muted-foreground">{message}</p>
              <BotyButton
                type="button"
                variant="primary"
                size="lg"
                className="w-full mt-4"
                onClick={() => router.push("/login")}
              >
                {t("loginButton")}
              </BotyButton>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="w-12 h-12 text-destructive mx-auto" />
              <h1 className="font-serif text-2xl">{t("failedTitle")}</h1>
              <p className="text-sm text-muted-foreground">{message}</p>
              <div className="flex flex-col gap-2 mt-4">
                <Link
                  href="/registro/verificar"
                  className="text-primary text-sm font-medium hover:underline"
                >
                  {t("requestNewLink")}
                </Link>
                <Link href="/login" className="text-muted-foreground text-sm hover:underline">
                  {t("goToLogin")}
                </Link>
              </div>
            </>
          )}
        </div>
      </AuthCard>
    </AuthShell>
  );
}

export default function VerificarEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailFallback() {
  const t = useTranslations("emailVerification");
  return <p className="text-center py-20 text-muted-foreground text-sm">{t("loading")}</p>;
}
