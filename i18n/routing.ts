import { defineRouting } from "next-intl/routing";

// "mx" and "us" are markets (language + default currency + shipping
// assumptions), not just languages — see lib/i18n/locale.ts.
export const routing = defineRouting({
  locales: ["mx", "us"],
  defaultLocale: "mx",
  localePrefix: "always",
});
