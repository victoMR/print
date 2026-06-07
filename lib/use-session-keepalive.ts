"use client";

import { useEffect } from "react";

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;

type Options = {
  enabled: boolean;
  onRefresh: () => void | Promise<void>;
  intervalMs?: number;
};

/** Renueva sesión al volver a la pestaña y periódicamente mientras está visible. */
export function useSessionKeepalive({ enabled, onRefresh, intervalMs = DEFAULT_INTERVAL_MS }: Options) {
  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      if (document.visibilityState !== "visible") return;
      void onRefresh();
    };

    window.addEventListener("focus", run);
    document.addEventListener("visibilitychange", run);
    const timer = window.setInterval(run, intervalMs);

    return () => {
      window.removeEventListener("focus", run);
      document.removeEventListener("visibilitychange", run);
      window.clearInterval(timer);
    };
  }, [enabled, onRefresh, intervalMs]);
}
