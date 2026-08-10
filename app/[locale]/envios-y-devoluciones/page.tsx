import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { LEGAL_CONTACT_EMAIL, LEGAL_CONTACT_MAILTO, SITE_WHATSAPP_URL } from "@/lib/legal/config";
import { getRequestMarket } from "@/lib/i18n/get-request-market";

function namespaceForMarket(market: "mx" | "us"): "shippingReturnsMx" | "shippingReturnsUs" {
  return market === "us" ? "shippingReturnsUs" : "shippingReturnsMx";
}

export async function generateMetadata(): Promise<Metadata> {
  const market = await getRequestMarket();
  const t = await getTranslations(namespaceForMarket(market));
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/envios-y-devoluciones" },
  };
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-12">
    <h2 className="font-serif text-2xl text-[#2A2726] mb-5 pb-3 border-b border-[#D4CFC5]">
      {title}
    </h2>
    <div className="space-y-4 text-[#5C5852] leading-relaxed text-[15px]">{children}</div>
  </section>
);

export default async function EnviosYDevolucionesPage() {
  const market = await getRequestMarket();
  const t = await getTranslations(namespaceForMarket(market));

  return (
    <main className="min-h-screen flex flex-col">
      <Header alwaysVisible />

      <div className="pt-[148px] pb-12 px-6 bg-[#F5F0E6]">
        <div className="max-w-2xl mx-auto">
          <p className="text-[11px] tracking-[0.25em] uppercase text-[#7A756E] mb-3">
            Mr. Paps
          </p>
          <h1 className="font-serif text-4xl md:text-5xl text-[#2A2726]">
            {t("title")}
          </h1>
          <p className="mt-4 text-[#7A756E] text-[15px] leading-relaxed">
            {t("subtitle")}
          </p>
        </div>
      </div>

      <div className="flex-1 py-14 px-6">
        <div className="max-w-2xl mx-auto">

          <Section title={t("shipping.title")}>
            <p>
              <strong>{t("shipping.coverageLabel")}</strong> {t("shipping.coverage")}
            </p>
            <p>
              <strong>{t("shipping.deliveryLabel")}</strong> {t("shipping.delivery")}
            </p>
            <p>
              <strong>{t("shipping.costLabel")}</strong> {t("shipping.cost")}
            </p>
            <p>
              <strong>{t("shipping.trackingLabel")}</strong> {t("shipping.tracking")}
            </p>
            <p>
              <strong>{t("shipping.noteLabel")}</strong> {t("shipping.note")}
            </p>
          </Section>

          <Section title={t("returns.title")}>
            <p>{t("returns.intro")}</p>

            <div className="bg-[#F5F0E6] p-5 border-l-2 border-[#2A2726]">
              <p className="font-semibold text-[#2A2726] mb-2">{t("returns.defectsTitle")}</p>
              <p>{t("returns.defectsBody")}</p>
              <p className="mt-2">
                {t("returns.defectsSendTo")}{" "}
                <a href={LEGAL_CONTACT_MAILTO} className="underline text-[#2A2726] hover:opacity-70">
                  {LEGAL_CONTACT_EMAIL}
                </a>{" "}
                {t("returns.defectsOr")}{" "}
                <a href={SITE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="underline text-[#2A2726] hover:opacity-70">
                  WhatsApp
                </a>
                {t("returns.defectsResolution")}
              </p>
            </div>

            <div className="bg-[#F5F0E6] p-5 border-l-2 border-[#5C1A24]">
              <p className="font-semibold text-[#2A2726] mb-2">{t("returns.cancelTitle")}</p>
              <p>{t("returns.cancelBody")}</p>
              <p className="mt-2">
                {t("returns.cancelContact")}{" "}
                <a href={SITE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="underline text-[#2A2726] hover:opacity-70">
                  WhatsApp
                </a>{" "}
                {t("returns.cancelOr")}{" "}
                <a href={LEGAL_CONTACT_MAILTO} className="underline text-[#2A2726] hover:opacity-70">
                  {LEGAL_CONTACT_EMAIL}
                </a>
                .
              </p>
            </div>
          </Section>

          <Section title={t("warranty.title")}>
            <p>{t("warranty.intro")}</p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>{t("warranty.printDefects")}</li>
              <li>{t("warranty.fabricDefects")}</li>
            </ul>
            <p>{t("warranty.exclusion")}</p>
          </Section>

          <Section title={t("questions.title")}>
            <p>{t("questions.intro")}</p>
            <ul className="space-y-2">
              <li>
                <strong>{t("questions.whatsappLabel")}</strong>{" "}
                <a href={SITE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70">
                  {t("questions.whatsappCta")}
                </a>
              </li>
              <li>
                <strong>{t("questions.emailLabel")}</strong>{" "}
                <a href={LEGAL_CONTACT_MAILTO} className="underline hover:opacity-70">
                  {LEGAL_CONTACT_EMAIL}
                </a>
              </li>
            </ul>
          </Section>

          <div className="pt-4 border-t border-[#D4CFC5]">
            <Link
              href="/shop"
              className="text-[11px] tracking-[0.2em] uppercase text-[#7A756E] hover:text-[#2A2726] boty-transition"
            >
              {t("backToShop")}
            </Link>
          </div>
        </div>
      </div>

      <Footer variant="compact" />
    </main>
  );
}
