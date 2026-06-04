"use client";

import { useRouter } from "next/navigation";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { OrderTrackingForm } from "@/components/boty/order-tracking-form";
import { BotyPageHeader, BotySurface } from "@/components/boty/ui-patterns";
import { trackGuestOrder } from "@/lib/api";
import { saveGuestOrderAccess } from "@/lib/order-guest-session";

export default function SeguimientoPage() {
  const router = useRouter();

  async function handleTrack(input: { trackingCode: string; email: string }) {
    const res = await trackGuestOrder(input.trackingCode, input.email);
    saveGuestOrderAccess(res.data.publicId, input.email);
    router.push(`/pedido/${encodeURIComponent(res.data.publicId)}`);
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 pt-28 pb-12 px-4 sm:px-6">
        <div className="max-w-md mx-auto space-y-8">
          <BotyPageHeader
            title="Seguimiento de pedido"
            description="Consulta el estado con tu código de seguimiento y el correo con el que compraste."
          />
          <BotySurface className="p-6 md:p-8">
            <OrderTrackingForm onSubmit={handleTrack} />
          </BotySurface>
          <p className="text-xs text-center text-muted-foreground">
            ¿Tienes cuenta?{" "}
            <a href="/login?redirect=/cuenta/pedidos" className="text-primary hover:underline">
              Inicia sesión
            </a>{" "}
            para ver todos tus pedidos.
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
