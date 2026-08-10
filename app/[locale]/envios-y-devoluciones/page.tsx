import type { Metadata } from "next";
import { Link } from "@/lib/i18n/navigation";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { LEGAL_CONTACT_EMAIL, LEGAL_CONTACT_MAILTO, SITE_WHATSAPP_URL } from "@/lib/legal/config";
import { SITE_NAME } from "@/lib/seo";
import { getRequestMarket } from "@/lib/i18n/get-request-market";

export async function generateMetadata(): Promise<Metadata> {
  const market = await getRequestMarket();
  return {
    title: market === "us" ? "Shipping & Returns" : "Envíos y Devoluciones",
    description:
      market === "us"
        ? `${SITE_NAME} shipping and returns policy. Shipped within the US in 5–10 business days.`
        : `Política de envíos y devoluciones de ${SITE_NAME}. Envíos a todo México en 5–14 días hábiles.`,
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

  if (market === "us") {
    return (
      <main className="min-h-screen flex flex-col">
        <Header alwaysVisible />

        <div className="pt-[148px] pb-12 px-6 bg-[#F5F0E6]">
          <div className="max-w-2xl mx-auto">
            <p className="text-[11px] tracking-[0.25em] uppercase text-[#7A756E] mb-3">
              Mr. Paps
            </p>
            <h1 className="font-serif text-4xl md:text-5xl text-[#2A2726]">
              Shipping & Returns
            </h1>
            <p className="mt-4 text-[#7A756E] text-[15px] leading-relaxed">
              All our products are made to order. Here's what to expect on delivery times and our returns policy.
            </p>
          </div>
        </div>

        <div className="flex-1 py-14 px-6">
          <div className="max-w-2xl mx-auto">

            <Section title="Shipping">
              <p>
                <strong>Coverage:</strong> We ship within the United States only, from a US-based fulfillment partner.
              </p>
              <p>
                <strong>Delivery time:</strong> Your order is produced and printed after checkout. Estimated delivery is <strong>5 to 10 business days</strong> from payment confirmation.
              </p>
              <p>
                <strong>Shipping cost:</strong> A flat shipping rate in USD is shown at checkout before you pay.
              </p>
              <p>
                <strong>Tracking:</strong> Once your order ships, you'll get a tracking number by email.
              </p>
              <p>
                <strong>Please note:</strong> Delivery times are estimates. Weather, holidays, or carrier delays may affect them.
              </p>
            </Section>

            <Section title="Returns & Refunds">
              <p>
                Since every product is made specifically for your order, <strong>we don't accept returns for buyer's remorse</strong>. We do stand behind the quality of our products.
              </p>

              <div className="bg-[#F5F0E6] p-5 border-l-2 border-[#2A2726]">
                <p className="font-semibold text-[#2A2726] mb-2">Manufacturing defects or damage</p>
                <p>
                  If your product arrives with a print defect, fabric damage, or the wrong item (size or product), you have <strong>5 days from delivery</strong> to report it.
                </p>
                <p className="mt-2">
                  Send photo evidence of the issue to{" "}
                  <a href={LEGAL_CONTACT_MAILTO} className="underline text-[#2A2726] hover:opacity-70">
                    {LEGAL_CONTACT_EMAIL}
                  </a>{" "}
                  or via{" "}
                  <a href={SITE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="underline text-[#2A2726] hover:opacity-70">
                    WhatsApp
                  </a>
                  . We'll arrange a free reshipment or a full refund.
                </p>
              </div>

              <div className="bg-[#F5F0E6] p-5 border-l-2 border-[#5C1A24]">
                <p className="font-semibold text-[#2A2726] mb-2">Order cancellation</p>
                <p>
                  You can cancel your order <strong>before it enters production</strong>. Once production has started, the order cannot be cancelled or modified.
                </p>
                <p className="mt-2">
                  To request a cancellation, contact us right away via{" "}
                  <a href={SITE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="underline text-[#2A2726] hover:opacity-70">
                    WhatsApp
                  </a>{" "}
                  or email at{" "}
                  <a href={LEGAL_CONTACT_MAILTO} className="underline text-[#2A2726] hover:opacity-70">
                    {LEGAL_CONTACT_EMAIL}
                  </a>
                  .
                </p>
              </div>
            </Section>

            <Section title="Product Warranty">
              <p>
                All our products come with a manufacturing and print-defect warranty:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>Print or manufacturing defects: <strong>6 months</strong> from date of purchase</li>
                <li>Fabric defects: <strong>6 months</strong> from date of purchase</li>
              </ul>
              <p>
                The warranty <strong>does not cover</strong> damage from improper use, discoloration from incorrect washing (check the care label), or normal wear and tear.
              </p>
            </Section>

            <Section title="Questions?">
              <p>
                We're here to help. Reach us through either of these:
              </p>
              <ul className="space-y-2">
                <li>
                  <strong>WhatsApp:</strong>{" "}
                  <a href={SITE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70">
                    Message us directly
                  </a>
                </li>
                <li>
                  <strong>Email:</strong>{" "}
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
                ← Back to the shop
              </Link>
            </div>
          </div>
        </div>

        <Footer variant="compact" />
      </main>
    );
  }

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
