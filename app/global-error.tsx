"use client";

import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** Fallback when the root layout fails — cannot use shared Header/Footer. */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAFAFA",
          fontFamily: "system-ui, sans-serif",
          color: "#1A1A1A",
        }}
      >
        <main
          style={{
            maxWidth: "28rem",
            padding: "2.5rem",
            textAlign: "center",
            borderRadius: "1.5rem",
            background: "rgba(245, 240, 235, 0.9)",
            boxShadow: "0 12px 24px rgba(14, 63, 126, 0.08)",
          }}
        >
          <p
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#C41E3A",
              marginBottom: "1rem",
            }}
          >
            Critical error · Error crítico
          </p>
          <h1 style={{ fontSize: "1.75rem", margin: "0 0 1rem" }}>
            Something went wrong · Algo salió mal
          </h1>
          <p style={{ color: "#6B6B6B", marginBottom: "2rem", lineHeight: 1.6 }}>
            An unexpected error occurred. Try reloading the page.
            <br />
            Ocurrió un error inesperado. Intenta recargar la página.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "0.75rem 2rem",
              borderRadius: "9999px",
              border: "none",
              background: "#C41E3A",
              color: "#fff",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Retry · Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
