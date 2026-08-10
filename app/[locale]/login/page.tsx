import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/boty/login-form";
import { noIndexRobots } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return {
    title: t("submit"),
    robots: noIndexRobots,
  };
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginForm />
    </Suspense>
  );
}

async function LoginPageFallback() {
  const t = await getTranslations("emailVerification");
  return <p className="text-center py-20 text-muted-foreground text-sm">{t("loading")}</p>;
}
