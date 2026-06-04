import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/boty/register-form";
import { noIndexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Crear cuenta",
  robots: noIndexRobots,
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<p className="text-center py-20 text-muted-foreground text-sm">Cargando…</p>}>
      <RegisterForm />
    </Suspense>
  );
}
