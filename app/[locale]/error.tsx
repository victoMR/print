"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { useEffect } from "react";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { GlassCard } from "@/components/ui/GlassCard";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const t = useTranslations("errorPage");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Header alwaysVisible />
      <div className="flex flex-1 items-center justify-center px-6 py-24">
        <GlassCard strong className="max-w-lg w-full p-10 text-center boty-shadow">
          <span className="mb-4 block text-sm tracking-[0.3em] uppercase text-primary">
            {t("eyebrow")}
          </span>
          <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4 text-balance">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            {t("description")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="w-full sm:w-auto px-8 py-3 rounded-full bg-primary text-primary-foreground text-sm font-medium boty-transition hover:opacity-90"
            >
              {t("retry")}
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto px-8 py-3 rounded-full glass text-sm font-medium text-foreground boty-transition hover:bg-white/20"
            >
              {t("goHome")}
            </Link>
          </div>
        </GlassCard>
      </div>
      <Footer />
    </main>
  );
}
