import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { DEFAULT_DESCRIPTION, SITE_NAME, getSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  description: `Aviso de privacidad de ${SITE_NAME}. Tratamiento de datos personales conforme a la legislación mexicana.`,
  alternates: { canonical: "/privacidad" },
};

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <article className="flex-1 pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
          <h1 className="font-serif text-3xl sm:text-4xl mb-2">Aviso de privacidad</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Última actualización: junio de 2026 · {SITE_NAME}
          </p>

          <section className="space-y-4 text-foreground/90 leading-relaxed">
            <p>
              {SITE_NAME} ({getSiteUrl()}), responsable del tratamiento de sus datos personales,
              pone a su disposición el presente aviso de privacidad conforme a la Ley Federal de
              Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).
            </p>

            <h2 className="font-serif text-xl mt-8 mb-2">Datos que recabamos</h2>
            <p>
              Para procesar pedidos y envíos recabamos: nombre, correo electrónico, teléfono,
              dirección de entrega y, de forma opcional, RFC cuando solicita factura (CFDI).
            </p>

            <h2 className="font-serif text-xl mt-8 mb-2">Finalidades</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Procesar y entregar su pedido.</li>
              <li>Cotizar envío y emitir comprobantes de pago.</li>
              <li>Comunicarnos sobre el estado del pedido.</li>
              <li>Emitir CFDI cuando proporcione RFC.</li>
            </ul>

            <h2 className="font-serif text-xl mt-8 mb-2">Encargados y transferencias</h2>
            <p>
              Compartimos datos estrictamente necesarios con proveedores de pago (Stripe),
              fulfillment e impresión bajo demanda (Printful, desde Tijuana, MX) y servicios de
              envío. No vendemos ni cedemos sus datos con fines de mercadotecnia a terceros.
            </p>

            <h2 className="font-serif text-xl mt-8 mb-2">Derechos ARCO</h2>
            <p>
              Puede acceder, rectificar, cancelar u oponerse al tratamiento de sus datos
              escribiendo a{" "}
              <a href="mailto:privacidad@mrpaps.mx" className="text-primary hover:underline">
                privacidad@mrpaps.mx
              </a>
              . Responderemos en un plazo máximo de 20 días hábiles.
            </p>

            <h2 className="font-serif text-xl mt-8 mb-2">Conservación</h2>
            <p>
              Conservamos los datos el tiempo necesario para cumplir las finalidades descritas y
              obligaciones fiscales aplicables en México.
            </p>

            <p className="text-sm text-muted-foreground mt-10">
              {DEFAULT_DESCRIPTION}
            </p>
          </section>

          <p className="mt-10">
            <Link href="/shop" className="text-primary hover:underline text-sm font-medium">
              ← Volver a la tienda
            </Link>
          </p>
        </div>
      </article>
      <Footer variant="compact" />
    </main>
  );
}
