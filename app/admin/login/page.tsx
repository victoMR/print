import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoginPage } from "@/components/admin/admin-login-page";
import { noIndexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Admin — Iniciar sesión",
  robots: noIndexRobots,
};

export default function AdminLoginRoute() {
  return (
    <Suspense
      fallback={
        <p className="text-center py-20 text-muted-foreground text-sm">Cargando…</p>
      }
    >
      <AdminLoginPage />
    </Suspense>
  );
}
