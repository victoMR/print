import type { Metadata } from "next";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { LegalTextDocument } from "@/components/legal/legal-text-document";
import { loadLegalTextForMarket } from "@/lib/legal/load-legal-text";
import { getRequestMarket } from "@/lib/i18n/get-request-market";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  description: `Aviso de privacidad integral de ${SITE_NAME}. Tratamiento de datos conforme a la LFPDPPP.`,
  alternates: { canonical: "/privacidad" },
};

export default async function PrivacidadPage() {
  const market = await getRequestMarket();
  const content = await loadLegalTextForMarket("privacidad", market);

  return (
    <main className="min-h-screen flex flex-col">
      <Header alwaysVisible />
      <LegalTextDocument content={content} />
      <Footer variant="compact" />
    </main>
  );
}
