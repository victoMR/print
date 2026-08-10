"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { OrderTrackingForm } from "@/components/boty/order-tracking-form";
import { BotyPageHeader, BotySurface } from "@/components/boty/ui-patterns";
import { trackGuestOrder } from "@/lib/api";
import { saveGuestOrderAccess } from "@/lib/order-guest-session";

export default function SeguimientoPage() {
  const t = useTranslations("tracking");
  const router = useRouter();

  async function handleTrack(input: { trackingCode: string; email: string }) {
    const res = await trackGuestOrder(input.trackingCode, input.email);
    saveGuestOrderAccess(res.data.publicId, input.email);
    router.push(`/pedido/${encodeURIComponent(res.data.publicId)}`);
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Header alwaysVisible />
      <div className="flex-1 pt-28 pb-12 px-4 sm:px-6">
        <div className="max-w-md mx-auto space-y-8">
          <BotyPageHeader
            title={t("title")}
            description={t("subtitle")}
          />
          <BotySurface className="p-6 md:p-8">
            <OrderTrackingForm onSubmit={handleTrack} />
          </BotySurface>
          <p className="text-xs text-center text-muted-foreground">
            {t("hasAccount")}{" "}
            <a href="/login?redirect=/cuenta/pedidos" className="text-primary hover:underline">
              {t("login")}
            </a>{" "}
            {t("loginSuffix")}
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
