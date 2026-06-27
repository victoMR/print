"use client";

import { Analytics } from "@vercel/analytics/next";
import { useCookieConsent } from "@/lib/cookie-consent-context";

export function ConditionalAnalytics() {
  const { consent } = useCookieConsent();
  if (!consent?.analytics) return null;
  return <Analytics />;
}
