import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";

export const metadata: Metadata = {
  title: "Nosotros — Mr. Paps",
  description:
    "Conoce la historia detrás de Mr. Paps: moda que habla en silencio, prendas producidas con intención y un compromiso genuino con la calidad.",
  alternates: { canonical: "/nosotros" },
};

const valores = [
  {
    num: "01",
    title: "LUJO SIN RUIDO",
    body: "Prendas que no necesitan anunciarse. El verdadero lujo es invisible para quien no sabe ver — y completamente legible para quien sí.",
  },
  {
    num: "02",
    title: "PRODUCCIÓN CONSCIENTE",
    body: "Cada pieza se crea al recibir tu pedido. Sin inventario masivo, sin desperdicio. Tu compra tiene un propósito antes de llegar a tus manos.",
  },
  {
    num: "03",
    title: "DISEÑO ATEMPORAL",
    body: "No seguimos tendencias: las observamos, las filtramos y creamos algo que permanece. Colecciones pensadas para durar más allá de una temporada.",
  },
];

export default function NosotrosPage() {
  return (
    <main className="bg-[#F5F0E6]">
      <Header alwaysVisible />

      {/* ── Hero ────────────────────────────────────── */}
      <section className="pt-[112px]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-28">
          <p className="text-[10px] tracking-[0.35em] uppercase font-sans text-[#7A756E] mb-6">
            SOBRE NOSOTROS
          </p>
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl tracking-[0.04em] uppercase text-[#2A2726] leading-none max-w-4xl">
            UNA MARCA<br />
            <span className="text-[#5C1A24]">CON PRESENCIA.</span>
          </h1>
        </div>

        {/* Divider image strip */}
        <div className="w-full h-[2px] bg-[#D4CFC5]" />
      </section>

      {/* ── Manifiesto ──────────────────────────────── */}
      <section className="bg-[#2A2726] py-24 lg:py-32">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-[10px] tracking-[0.35em] uppercase font-sans text-[#D4CFC5]/60 mb-10">
            MANIFIESTO
          </p>
          <blockquote className="font-serif text-3xl md:text-4xl lg:text-5xl tracking-[0.04em] text-[#F5F0E6] leading-snug">
            "Diseño, poder & estilo.<br className="hidden md:block" />
            Presencia que permanece."
          </blockquote>
          <p className="mt-10 text-[12px] tracking-[0.12em] font-sans text-[#D4CFC5]/70 max-w-xl mx-auto leading-relaxed">
            Mr. Paps nació de una convicción: la moda más poderosa no grita.
            Habla en los detalles, en la caída de una tela, en la precisión de
            un acabado. Creamos para quienes entienden eso.
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
                NUESTRA HISTORIA
              </p>
              <h2 className="font-serif text-4xl md:text-5xl tracking-[0.04em] uppercase text-[#2A2726] leading-tight mb-10">
                Nació de<br />una pregunta.
              </h2>
              <div className="space-y-6 text-[13px] leading-[1.9] text-[#7A756E] tracking-[0.04em]">
                <p>
                  ¿Por qué la ropa que realmente expresa quién eres tiene que
                  ser escasa, inaccesible o genérica? Esa pregunta fue el
                  origen de Mr. Paps.
                </p>
                <p>
                  Empezamos con una premisa simple: calidad de autor, sin los
                  intermediarios que encarecen sin agregar valor. Producción
                  bajo demanda, con materiales seleccionados y atención obsesiva
                  al acabado de cada pieza.
                </p>
                <p>
                  Hoy somos una marca que mezcla identidad editorial con la
                  comodidad de lo cotidiano. Prendas que se sienten bien porque
                  están bien hechas — no porque un logo diga que deberían estarlo.
                </p>
              </div>
            </div>

            {/* Right: accent block */}
            <div className="space-y-6">
              <div className="bg-[#2A2726] aspect-[4/3] flex items-end p-10">
                <div>
                  <p className="font-serif text-5xl text-[#5C1A24] mb-2">—</p>
                  <p className="font-serif text-xl text-[#F5F0E6] tracking-[0.06em] leading-snug">
                    "La prenda perfecta es aquella que pasa desapercibida para
                    todos, excepto para quien la usa."
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="border border-[#D4CFC5] p-8">
                  <p className="font-serif text-4xl text-[#2A2726] mb-2">100%</p>
                  <p className="text-[11px] tracking-[0.18em] uppercase font-sans text-[#7A756E]">
                    Producción bajo pedido
                  </p>
                </div>
                <div className="border border-[#D4CFC5] p-8">
                  <p className="font-serif text-4xl text-[#5C1A24] mb-2">MX</p>
                  <p className="text-[11px] tracking-[0.18em] uppercase font-sans text-[#7A756E]">
                    Hecho en México para México
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
            LO QUE NOS DEFINE
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
                EL PROCESO
              </p>
              <div>
                <p className="font-serif text-7xl lg:text-8xl text-[#F5F0E6] mb-4">5–14</p>
                <p className="text-[12px] tracking-[0.15em] uppercase font-sans text-[#F5F0E6]/70">
                  días de producción y envío<br />para una prenda única
                </p>
              </div>
              <p className="font-serif text-lg text-[#F5F0E6]/80 leading-relaxed">
                Cada pedido activa su propia cadena de producción. Nada existe
                en bodega: tu pieza se crea específicamente para ti.
              </p>
            </div>

            {/* Right: process steps */}
            <div className="space-y-10">
              <p className="text-[10px] tracking-[0.35em] uppercase font-sans text-[#7A756E]">
                ASÍ FUNCIONA
              </p>
              {[
                { n: "1", t: "Eliges tu pieza", d: "Navegas el catálogo, seleccionas color, talla y cantidad. Sin mínimos, sin esperas de restock." },
                { n: "2", t: "Producción a tu medida", d: "Tu pedido se envía a producción en el momento de confirmarse. Impresión de alta resolución sobre materiales premium." },
                { n: "3", t: "Empaque y envío", d: "La pieza se revisa, empaca y despacha directamente hacia ti. Seguimiento en tiempo real desde el primer día." },
              ].map((step) => (
                <div key={step.n} className="flex gap-8 items-start border-b border-[#D4CFC5] pb-10 last:border-0 last:pb-0">
                  <span className="font-serif text-3xl text-[#D4CFC5] shrink-0 w-8">{step.n}</span>
                  <div>
                    <h3 className="text-[11px] tracking-[0.18em] uppercase font-sans text-[#2A2726] mb-2">
                      {step.t}
                    </h3>
                    <p className="text-[13px] leading-relaxed text-[#7A756E] tracking-[0.04em]">
                      {step.d}
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
            EXPLORAR
          </p>
          <h2 className="font-serif text-4xl md:text-6xl tracking-[0.04em] uppercase text-[#2A2726] mb-12">
            La colección<br />te espera.
          </h2>
          <Link
            href="/shop"
            className="inline-block px-12 py-4 bg-[#5C1A24] text-[#f8f9fa] text-[11px] tracking-[0.28em] uppercase font-sans boty-transition hover:bg-[#4A1520]"
          >
            DESCUBRIR COLECCIÓN
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
