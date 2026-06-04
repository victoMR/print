import type { Metadata } from "next";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { BotyCheckoutFlow } from "@/components/boty/checkout-flow";
import { noIndexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Finaliza tu compra de forma segura en Mr. Paps.",
  robots: noIndexRobots,
};

export default function CheckoutPage() {
  return (
    <div className="flex flex-col bg-muted/20">
      <Header />
      <main className="min-h-screen pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <BotyCheckoutFlow />
      </main>
      <Footer />
    </div>
  );
}
