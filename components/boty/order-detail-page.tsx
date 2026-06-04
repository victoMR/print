"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  fetchAccountOrderDetail,
  fetchGuestOrderDetail,
  trackGuestOrder,
} from "@/lib/api";
import type { OrderDetail } from "@/lib/api-types";
import { getGuestOrderAccess, saveGuestOrderAccess } from "@/lib/order-guest-session";
import { OrderTrackingForm } from "./order-tracking-form";
import { OrderDetailSkeleton, OrderDetailView } from "./order-detail-view";
import { BotyAlert, BotySurface } from "./ui-patterns";

type OrderDetailPageProps = {
  publicOrderId: string;
  variant: "public" | "account";
};

function OrderDetailPageInner({ publicOrderId, variant }: OrderDetailPageProps) {
  const params = useSearchParams();
  const paid = params.get("paid") === "1";
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (variant === "account") {
          const res = await fetchAccountOrderDetail(publicOrderId);
          if (!cancelled) setOrder(res.data);
          return;
        }

        const saved = getGuestOrderAccess(publicOrderId);
        if (!saved) {
          if (!cancelled) {
            setNeedsVerification(true);
            setOrder(null);
          }
          return;
        }

        const res = await fetchGuestOrderDetail(publicOrderId, saved.email);
        if (!cancelled) setOrder(res.data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el pedido");
          setOrder(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [publicOrderId, variant]);

  async function handleVerify(input: { trackingCode: string; email: string }) {
    const res = await trackGuestOrder(input.trackingCode, input.email);
    saveGuestOrderAccess(res.data.publicId, input.email);
    setNeedsVerification(false);
    setError(null);
    setOrder(res.data);
  }

  if (loading) return <OrderDetailSkeleton />;

  if (needsVerification) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <h1 className="font-serif text-3xl">Verifica tu pedido</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Por seguridad, confirma el código de seguimiento y el correo con el que compraste.
          </p>
        </div>
        <BotySurface className="p-6">
          <OrderTrackingForm
            initialTrackingCode={publicOrderId}
            submitLabel="Ver pedido"
            onSubmit={handleVerify}
          />
        </BotySurface>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <BotyAlert variant="error">{error}</BotyAlert>
        {variant === "public" && (
          <BotySurface className="p-6">
            <OrderTrackingForm
              initialTrackingCode={publicOrderId}
              submitLabel="Reintentar"
              onSubmit={handleVerify}
            />
          </BotySurface>
        )}
      </div>
    );
  }

  if (!order) return <OrderDetailSkeleton />;

  return (
    <OrderDetailView
      order={order}
      showThankYou={paid}
      variant={variant}
      backHref={variant === "account" ? "/cuenta/pedidos" : "/seguimiento"}
      backLabel={variant === "account" ? "Mis pedidos" : "Seguimiento"}
    />
  );
}

export function OrderDetailPage(props: OrderDetailPageProps) {
  return (
    <Suspense fallback={<OrderDetailSkeleton />}>
      <OrderDetailPageInner {...props} />
    </Suspense>
  );
}
