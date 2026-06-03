import { Suspense } from "react";
import { RegisterForm } from "@/components/boty/register-form";

export const metadata = { title: "Crear cuenta — Mr. Paps" };

export default function RegisterPage() {
  return (
    <Suspense fallback={<p className="text-center py-20 text-muted-foreground text-sm">Cargando…</p>}>
      <RegisterForm />
    </Suspense>
  );
}
