import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { BotyCheckoutFlow } from "@/components/boty/checkout-flow";

export const metadata = {
  title: "Checkout — Mr. Paps",
};

export default function CheckoutPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <div className="pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
              Checkout
            </h1>
            <p className="text-muted-foreground">
              Completa tu dirección y confirma tu pedido borrador
            </p>
          </div>
          <BotyCheckoutFlow />
        </div>
      </div>
      <Footer />
    </main>
  );
}
