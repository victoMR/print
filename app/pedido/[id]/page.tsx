import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { OrderStatus } from "@/components/boty/order-status";

type PedidoPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PedidoPage({ params }: PedidoPageProps) {
  const { id } = await params;

  return (
    <main className="min-h-screen">
      <Header />
      <div className="pt-28 pb-20 px-6">
        <OrderStatus internalOrderId={id} />
      </div>
      <Footer />
    </main>
  );
}
