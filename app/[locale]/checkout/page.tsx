import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { BotyCheckoutFlow } from "@/components/boty/checkout-flow";
import { noIndexRobots } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checkout.metadata");
  return {
    title: t("title"),
    description: t("description"),
    robots: noIndexRobots,
  };
}

export default function CheckoutPage() {
  return (
    <div className="flex flex-col bg-muted/20">
      <Header alwaysVisible />
      <main className="min-h-screen pt-[148px] pb-16 px-4 sm:px-6 lg:px-8">
        <BotyCheckoutFlow />
      </main>
      <Footer />
    </div>
  );
}
