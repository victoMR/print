import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { CartView } from "@/components/cart/CartView";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { noIndexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Carrito",
  description: "Revisa los productos en tu carrito antes de pagar.",
  robots: noIndexRobots,
};

export default async function CarritoPage() {
  const t = await getTranslations("cart");
  return (
    <main className="min-h-screen flex flex-col bg-[#F5F0E6]">
      <Header alwaysVisible />
      <div className="flex-1 pt-[100px]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
          <h1 className="font-serif text-4xl md:text-5xl tracking-[0.08em] uppercase text-[#2A2726] mb-10">
            {t("title")}
          </h1>
          <CartView />
        </div>
      </div>
      <Footer />
    </main>
  );
}
