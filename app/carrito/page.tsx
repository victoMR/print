import { CartView } from "@/components/cart/CartView";
import type { Metadata } from "next";
import { noIndexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Carrito",
  description: "Revisa los productos en tu carrito antes de pagar.",
  robots: noIndexRobots,
};

export default function CarritoPage() {
  return (
    <section className="px-4 pb-16 md:px-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">Tu carrito</h1>
        <CartView />
      </div>
    </section>
  );
}
