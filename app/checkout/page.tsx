import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout",
};

export default function CheckoutPage() {
  return (
    <section className="px-4 pb-16 md:px-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>
        <CheckoutFlow />
      </div>
    </section>
  );
}
