import { defineRouting } from "next-intl/routing";

// Path locales are markets (/mx, /us) — currency and pricing.
// UI language (es|en) is a separate cookie; see lib/i18n/locale.ts and i18n/request.ts.
export const routing = defineRouting({
  locales: ["mx", "us"],
  defaultLocale: "mx",
  localePrefix: "always",
});
