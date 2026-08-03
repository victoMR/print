import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { CartProvider } from "@/lib/cart-context";
import { CustomerProvider } from "@/lib/customer-context";
import { CookieConsentProvider } from "@/lib/cookie-consent-context";
import { CookieConsentBanner } from "@/components/legal/cookie-consent-banner";
import { ConditionalAnalytics } from "@/components/legal/conditional-analytics";
import { HtmlLangSync } from "@/components/layout/HtmlLangSync";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Makes the locale available to Server Components in this request's render
  // tree (getRequestConfig's `requestLocale`) directly from the URL segment —
  // no middleware involvement needed for this, since middleware.ts doesn't
  // delegate to next-intl's own locale-detection (see middleware.ts's docstring).
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HtmlLangSync />
      <CookieConsentProvider>
        <CustomerProvider>
          <CartProvider>{children}</CartProvider>
        </CustomerProvider>
        <CookieConsentBanner />
        {process.env.NEXT_PUBLIC_VERCEL_ANALYTICS === "true" ? <ConditionalAnalytics /> : null}
      </CookieConsentProvider>
    </NextIntlClientProvider>
  );
}
