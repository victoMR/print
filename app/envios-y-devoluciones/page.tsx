import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { LEGAL_CONTACT_EMAIL, LEGAL_CONTACT_MAILTO, SITE_WHATSAPP_URL } from "@/lib/legal/config";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Envíos y Devoluciones",
  description: `Política de envíos y devoluciones de ${SITE_NAME}. Envíos a todo México en 5–14 días hábiles.`,
  alternates: { canonical: "/envios-y-devoluciones" },
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-12">
    <h2 className="font-serif text-2xl text-[#2A2726] mb-5 pb-3 border-b border-[#D4CFC5]">
      {title}
    </h2>
    <div className="space-y-4 text-[#5C5852] leading-relaxed text-[15px]">{children}</div>
  </section>
);

export default function EnviosYDevolucionesPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header alwaysVisible />

      {/* Hero */}
      <div className="pt-[148px] pb-12 px-6 bg-[#F5F0E6]">
        <div className="max-w-2xl mx-auto">
          <p className="text-[11px] tracking-[0.25em] uppercase text-[#7A756E] mb-3">
            Mr. Paps
          </p>
          <h1 className="font-serif text-4xl md:text-5xl text-[#2A2726]">
            Envíos y Devoluciones
          </h1>
          <p className="mt-4 text-[#7A756E] text-[15px] leading-relaxed">
            Todos nuestros productos se fabrican bajo demanda. Conoce los tiempos de entrega y nuestra política de devoluciones.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 py-14 px-6">
        <div className="max-w-2xl mx-auto">

          <Section title="Envíos">
            <p>
              <strong>Cobertura:</strong> Realizamos envíos únicamente dentro de la República Mexicana.
            </p>
            <p>
              <strong>Tiempo de entrega:</strong> Nuestros productos se fabrican e imprimen al recibir tu pedido. El tiempo estimado de entrega es de <strong>5 a 14 días hábiles</strong> a partir de la confirmación de pago, dependiendo de tu ubicación.
            </p>
            <p>
              <strong>Costo de envío:</strong> El costo se calcula automáticamente al ingresar tu dirección en el checkout, antes de confirmar el pago. Seleccionamos la tarifa más económica disponible.
            </p>
            <p>
              <strong>Seguimiento:</strong> Una vez que tu pedido sea enviado, recibirás un número de guía en tu correo para rastrear la entrega en tiempo real.
            </p>
            <p>
              <strong>Nota importante:</strong> Los tiempos de entrega son estimados. Factores externos como condiciones climáticas, días festivos o saturación de la paquetería pueden afectar el plazo de entrega.
            </p>
          </Section>

          <Section title="Devoluciones y Reembolsos">
            <p>
              Dado que cada producto se fabrica específicamente para tu pedido, <strong>no aceptamos devoluciones por cambio de opinión</strong>. Sin embargo, garantizamos la calidad de nuestros productos.
            </p>

            <div className="bg-[#F5F0E6] p-5 border-l-2 border-[#2A2726]">
              <p className="font-semibold text-[#2A2726] mb-2">Defectos o daños de fabricación</p>
              <p>
                Si tu producto llega con un defecto de impresión, daño en la tela, o error en el pedido (talla o producto incorrecto), tienes <strong>5 días hábiles a partir de la entrega</strong> para reportarlo.
              </p>
              <p className="mt-2">
                Envíanos evidencia fotográfica del defecto a{" "}
                <a href={LEGAL_CONTACT_MAILTO} className="underline text-[#2A2726] hover:opacity-70">
                  {LEGAL_CONTACT_EMAIL}
                </a>{" "}
                o por{" "}
                <a href={SITE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="underline text-[#2A2726] hover:opacity-70">
                  WhatsApp
                </a>
                . Gestionaremos el reenvío del producto sin costo adicional o el reembolso completo.
              </p>
            </div>

            <div className="bg-[#F5F0E6] p-5 border-l-2 border-[#5C1A24]">
              <p className="font-semibold text-[#2A2726] mb-2">Cancelación de pedido</p>
              <p>
                Puedes cancelar tu pedido <strong>antes de que entre a producción</strong>. Una vez que el proceso de fabricación ha iniciado, no es posible cancelar ni modificar el pedido.
              </p>
              <p className="mt-2">
                Para solicitar una cancelación, contáctanos de inmediato por{" "}
                <a href={SITE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="underline text-[#2A2726] hover:opacity-70">
                  WhatsApp
                </a>{" "}
                o por correo a{" "}
                <a href={LEGAL_CONTACT_MAILTO} className="underline text-[#2A2726] hover:opacity-70">
                  {LEGAL_CONTACT_EMAIL}
                </a>
                .
              </p>
            </div>
          </Section>

          <Section title="Garantía del producto">
            <p>
              Todos nuestros productos cuentan con la garantía mínima obligatoria establecida en la Ley Federal de Protección al Consumidor (LFPC):
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>Defectos de impresión o fabricación: <strong>6 meses</strong> desde la fecha de compra</li>
              <li>Defectos de tela: <strong>6 meses</strong> desde la fecha de compra</li>
            </ul>
            <p>
              La garantía <strong>no cubre</strong> daños por uso inadecuado, decoloración por lavado incorrecto (consulta las instrucciones de lavado en la etiqueta), ni desgaste natural del producto.
            </p>
          </Section>

          <Section title="¿Tienes dudas?">
            <p>
              Estamos para ayudarte. Contáctanos por cualquiera de estos medios:
            </p>
            <ul className="space-y-2">
              <li>
                <strong>WhatsApp:</strong>{" "}
                <a href={SITE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70">
                  Escríbenos directamente
                </a>
              </li>
              <li>
                <strong>Correo:</strong>{" "}
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
              ← Volver a la tienda
            </Link>
          </div>
        </div>
      </div>

      <Footer variant="compact" />
    </main>
  );
}
