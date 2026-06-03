import { Suspense } from "react";
import { LoginForm } from "@/components/boty/login-form";

export const metadata = { title: "Iniciar sesión — Mr. Paps" };

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-center py-20 text-muted-foreground text-sm">Cargando…</p>}>
      <LoginForm />
    </Suspense>
  );
}
