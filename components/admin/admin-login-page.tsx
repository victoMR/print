"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { adminFetchMe } from "@/lib/api";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { safeRedirectPath } from "@/lib/safe-redirect";

export function AdminLoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = safeRedirectPath(params.get("redirect"), "/admin");

  useEffect(() => {
    void adminFetchMe()
      .then(() => router.replace(redirect))
      .catch(() => {
        /* sin sesión válida — mostrar formulario */
      });
  }, [redirect, router]);

  return (
    <AdminLogin
      onSuccess={() => {
        router.push(redirect);
      }}
    />
  );
}
