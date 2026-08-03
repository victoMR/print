import { Link } from "@/lib/i18n/navigation";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";

type ProductUnavailableProps = {
  title?: string;
  message?: string;
};

export function ProductUnavailable({
  title = "Producto no disponible",
  message = "Este producto aún no tiene variantes activas (talla/precio). Si eres el administrador, edítalo en el panel y agrega variantes.",
}: ProductUnavailableProps) {
  return (
    <main className="min-h-screen">
      <Header />
      <section className="max-w-lg mx-auto px-6 pt-32 pb-20 text-center">
        <h1 className="font-serif text-2xl">{title}</h1>
        <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{message}</p>
        <Link
          href="/shop"
          className="inline-flex mt-8 px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm hover:bg-primary/90 boty-transition"
        >
          Volver a la tienda
        </Link>
      </section>
      <Footer />
    </main>
  );
}
