import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { GlassCard } from "@/components/ui/GlassCard";
import { noIndexRobots } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notFound");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: noIndexRobots,
  };
}

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Header alwaysVisible />
      <div className="flex flex-1 items-center justify-center px-6 py-24 pt-32">
        <GlassCard strong className="max-w-lg w-full p-10 text-center boty-shadow">
          <p className="font-serif text-7xl md:text-8xl text-primary/20 mb-2 leading-none">
            404
          </p>
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
            <Link
              href="/"
              className="w-full sm:w-auto min-h-11 inline-flex items-center justify-center px-8 py-3 rounded-full bg-primary text-primary-foreground text-sm font-medium boty-transition hover:opacity-90"
            >
              {t("goHome")}
            </Link>
            <Link
              href="/shop"
              className="w-full sm:w-auto min-h-11 inline-flex items-center justify-center px-8 py-3 rounded-full glass text-sm font-medium text-foreground boty-transition hover:bg-white/20"
            >
              {t("viewShop")}
            </Link>
          </div>
        </GlassCard>
      </div>
      <Footer variant="compact" />
    </main>
  );
}
