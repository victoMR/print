import type { Metadata } from "next";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { LegalTextDocument } from "@/components/legal/legal-text-document";
import { loadLegalText } from "@/lib/legal/load-legal-text";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: `Términos y condiciones de uso y compra de ${SITE_NAME}.`,
  alternates: { canonical: "/terminos" },
};

export default async function TerminosPage() {
  const content = await loadLegalText("MrPaps_Terminos_Condiciones_v1.txt");

  return (
    <main className="min-h-screen flex flex-col">
      <Header alwaysVisible />
      <LegalTextDocument content={content} />
      <Footer variant="compact" />
    </main>
  );
}
