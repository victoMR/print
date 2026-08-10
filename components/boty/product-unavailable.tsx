import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";

type ProductUnavailableProps = {
  title?: string;
  message?: string;
};

export async function ProductUnavailable({
  title,
  message,
}: ProductUnavailableProps) {
  const t = await getTranslations("shop.unavailable");
  return (
    <main className="min-h-screen">
      <Header />
      <section className="max-w-lg mx-auto px-6 pt-32 pb-20 text-center">
        <h1 className="font-serif text-2xl">{title ?? t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{message ?? t("defaultMessage")}</p>
        <Link
          href="/shop"
          className="inline-flex mt-8 px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm hover:bg-primary/90 boty-transition"
        >
          {t("backToShop")}
        </Link>
      </section>
      <Footer />
    </main>
  );
}
