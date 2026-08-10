import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/nosotros" },
  };
}

export default async function NosotrosPage() {
  const t = await getTranslations("about");
  const valores = t.raw("values.items") as Array<{ num: string; title: string; body: string }>;
  const procesoPasos = t.raw("process.steps") as Array<{ title: string; body: string }>;

  return (
    <main className="bg-[#F5F0E6]">
      <Header alwaysVisible />

      {/* ── Hero ────────────────────────────────────── */}
      <section className="pt-[112px]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-28">
          <p className="text-[10px] tracking-[0.35em] uppercase font-sans text-[#7A756E] mb-6">
            {t("hero.eyebrow")}
          </p>
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl tracking-[0.04em] uppercase text-[#2A2726] leading-none max-w-4xl">
            {t("hero.titleLine1")}<br />
            <span className="text-[#5C1A24]">{t("hero.titleLine2")}</span>
          </h1>
        </div>

        {/* Divider image strip */}
        <div className="w-full h-[2px] bg-[#D4CFC5]" />
      </section>

      {/* ── Manifiesto ──────────────────────────────── */}
      <section className="bg-[#2A2726] py-24 lg:py-32">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-[10px] tracking-[0.35em] uppercase font-sans text-[#D4CFC5]/60 mb-10">
            {t("manifesto.eyebrow")}
          </p>
          <blockquote className="font-serif text-3xl md:text-4xl lg:text-5xl tracking-[0.04em] text-[#F5F0E6] leading-snug">
            {t("manifesto.quoteLine1")}<br className="hidden md:block" />
            {t("manifesto.quoteLine2")}
          </blockquote>
          <p className="mt-10 text-[12px] tracking-[0.12em] font-sans text-[#D4CFC5]/70 max-w-xl mx-auto leading-relaxed">
            {t("manifesto.body")}
          </p>
        </div>
      </section>

      {/* ── Historia ────────────────────────────────── */}
      <section className="py-24 lg:py-32 border-b border-[#D4CFC5]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
            {/* Left: story text */}
            <div>
              <p className="text-[10px] tracking-[0.35em] uppercase font-sans text-[#7A756E] mb-8">
                {t("story.eyebrow")}
              </p>
              <h2 className="font-serif text-4xl md:text-5xl tracking-[0.04em] uppercase text-[#2A2726] leading-tight mb-10">
                {t("story.titleLine1")}<br />{t("story.titleLine2")}
              </h2>
              <div className="space-y-6 text-[13px] leading-[1.9] text-[#7A756E] tracking-[0.04em]">
                <p>{t("story.paragraph1")}</p>
                <p>{t("story.paragraph2")}</p>
                <p>{t("story.paragraph3")}</p>
              </div>
            </div>

            {/* Right: accent block */}
            <div className="space-y-6">
              <div className="bg-[#2A2726] aspect-[4/3] flex items-end p-10">
                <div>
                  <p className="font-serif text-5xl text-[#5C1A24] mb-2">—</p>
                  <p className="font-serif text-xl text-[#F5F0E6] tracking-[0.06em] leading-snug">
                    {t("story.quote")}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="border border-[#D4CFC5] p-8">
                  <p className="font-serif text-4xl text-[#2A2726] mb-2">{t("story.stat1Value")}</p>
                  <p className="text-[11px] tracking-[0.18em] uppercase font-sans text-[#7A756E]">
                    {t("story.stat1Label")}
                  </p>
                </div>
                <div className="border border-[#D4CFC5] p-8">
                  <p className="font-serif text-4xl text-[#5C1A24] mb-2">{t("story.stat2Value")}</p>
                  <p className="text-[11px] tracking-[0.18em] uppercase font-sans text-[#7A756E]">
                    {t("story.stat2Label")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Valores ─────────────────────────────────── */}
      <section className="py-24 lg:py-32 border-b border-[#D4CFC5]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-[10px] tracking-[0.35em] uppercase font-sans text-[#7A756E] mb-16">
            {t("values.eyebrow")}
          </p>
          <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
            {valores.map((v) => (
              <div key={v.num} className="border-t border-[#D4CFC5] pt-8">
                <p className="font-serif text-5xl text-[#D4CFC5] mb-6">{v.num}</p>
                <h3 className="text-[11px] tracking-[0.22em] uppercase font-sans text-[#2A2726] mb-4">
                  {v.title}
                </h3>
                <p className="text-[13px] leading-[1.9] text-[#7A756E] tracking-[0.04em]">
                  {v.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Proceso ─────────────────────────────────── */}
      <section className="py-24 lg:py-32 border-b border-[#D4CFC5]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            {/* Left: dark stat box */}
            <div className="bg-[#5C1A24] aspect-square flex flex-col justify-between p-12 lg:p-16">
              <p className="text-[10px] tracking-[0.35em] uppercase font-sans text-[#F5F0E6]/50">
                {t("process.eyebrow")}
              </p>
              <div>
                <p className="font-serif text-7xl lg:text-8xl text-[#F5F0E6] mb-4">{t("process.statValue")}</p>
                <p className="text-[12px] tracking-[0.15em] uppercase font-sans text-[#F5F0E6]/70">
                  {t("process.statLabelLine1")}<br />{t("process.statLabelLine2")}
                </p>
              </div>
              <p className="font-serif text-lg text-[#F5F0E6]/80 leading-relaxed">
                {t("process.description")}
              </p>
            </div>

            {/* Right: process steps */}
            <div className="space-y-10">
              <p className="text-[10px] tracking-[0.35em] uppercase font-sans text-[#7A756E]">
                {t("process.stepsEyebrow")}
              </p>
              {procesoPasos.map((step, idx) => (
                <div key={step.title} className="flex gap-8 items-start border-b border-[#D4CFC5] pb-10 last:border-0 last:pb-0">
                  <span className="font-serif text-3xl text-[#D4CFC5] shrink-0 w-8">{idx + 1}</span>
                  <div>
                    <h3 className="text-[11px] tracking-[0.18em] uppercase font-sans text-[#2A2726] mb-2">
                      {step.title}
                    </h3>
                    <p className="text-[13px] leading-relaxed text-[#7A756E] tracking-[0.04em]">
                      {step.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-[10px] tracking-[0.35em] uppercase font-sans text-[#7A756E] mb-8">
            {t("cta.eyebrow")}
          </p>
          <h2 className="font-serif text-4xl md:text-6xl tracking-[0.04em] uppercase text-[#2A2726] mb-12">
            {t("cta.titleLine1")}<br />{t("cta.titleLine2")}
          </h2>
          <Link
            href="/shop"
            className="inline-block px-12 py-4 bg-[#5C1A24] text-[#f8f9fa] text-[11px] tracking-[0.28em] uppercase font-sans boty-transition hover:bg-[#4A1520]"
          >
            {t("cta.button")}
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
