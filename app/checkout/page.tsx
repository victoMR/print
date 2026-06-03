import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { BotyCheckoutFlow } from "@/components/boty/checkout-flow";

export const metadata = {
  title: "Checkout — Mr. Paps",
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
