import type { Metadata } from "next";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { LegalTextDocument } from "@/components/legal/legal-text-document";
import { loadLegalTextForMarket } from "@/lib/legal/load-legal-text";
import { getRequestMarket } from "@/lib/i18n/get-request-market";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: `Términos y condiciones de uso y compra de ${SITE_NAME}.`,
  alternates: { canonical: "/terminos" },
};

export default async function TerminosPage() {
  const market = await getRequestMarket();
  const content = await loadLegalTextForMarket("terminos", market);

  return (
    <main className="min-h-screen flex flex-col">
      <Header alwaysVisible />
      <LegalTextDocument content={content} />
      <Footer variant="compact" />
    </main>
  );
}
