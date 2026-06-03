import { Suspense } from "react";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { PedidoDetailContent } from "./pedido-detail-content";

type PedidoPageProps = { params: Promise<{ id: string }> };

export default async function PedidoPage({ params }: PedidoPageProps) {
  const { id } = await params;
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 pt-28 pb-12 px-4 sm:px-6">
        <Suspense fallback={<p className="text-center text-muted-foreground text-sm py-16">Cargando…</p>}>
          <PedidoDetailContent publicOrderId={id} />
        </Suspense>
      </div>
      <Footer />
    </main>
  );
}
