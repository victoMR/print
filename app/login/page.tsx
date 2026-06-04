import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/boty/login-form";
import { noIndexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  robots: noIndexRobots,
};

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-center py-20 text-muted-foreground text-sm">Cargando…</p>}>
      <LoginForm />
    </Suspense>
  );
}
