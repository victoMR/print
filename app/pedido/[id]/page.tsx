import { OrderStatusView } from "@/components/checkout/OrderStatusView";
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Pedido ${id.slice(0, 8)}…` };
}

export default async function PedidoPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <section className="px-4 pb-16 md:px-6">
      <OrderStatusView internalOrderId={id} />
    </section>
  );
}
