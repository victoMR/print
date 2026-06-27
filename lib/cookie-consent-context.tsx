"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ConsentState = { analytics: boolean } | null;

type CookieConsentContextValue = {
  consent: ConsentState;
  acceptAll: () => void;
  acceptEssential: () => void;
};

const STORAGE_KEY = "mrpaps-cookie-consent";

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentState>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ConsentState;
        setConsent(parsed);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  function save(value: { analytics: boolean }) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...value, ts: new Date().toISOString() }));
    } catch {
      // ignore
    }
    setConsent(value);
  }

  const value: CookieConsentContextValue = {
    consent: hydrated ? consent : null,
    acceptAll: () => save({ analytics: true }),
    acceptEssential: () => save({ analytics: false }),
  };

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error("useCookieConsent must be used inside CookieConsentProvider");
  return ctx;
}
