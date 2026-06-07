"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { adminFetchMe } from "@/lib/api";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { safeRedirectPath } from "@/lib/safe-redirect";

export function AdminLoginPage() {
  const params = useSearchParams();
  const redirect = safeRedirectPath(params.get("redirect"), "/admin");

  // Si ya hay sesión activa, ir directamente al panel.
  useEffect(() => {
    void adminFetchMe()
      .then(() => { window.location.href = redirect; })
      .catch(() => { /* sin sesión — mostrar formulario */ });
  }, [redirect]);

  return (
    <AdminLogin
      onSuccess={() => {
        // Full page navigation ensures the fresh HttpOnly cookies are available
        // to all Next.js middleware and server checks without race conditions.
        window.location.href = redirect;
      }}
    />
  );
}
