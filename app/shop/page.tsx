import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { ShopPageContent } from "@/components/boty/shop-page-content";
import { fetchCatalogProducts } from "@/lib/api";

export const metadata = {
  title: "Shop — Mr. Paps",
};

export default async function ShopPage() {
  const catalog = await fetchCatalogProducts();
  const products = catalog?.data ?? [];

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1">
        <ShopPageContent products={products} />
      </div>
      <div className="mt-auto w-full shrink-0">
        <Footer />
      </div>
    </main>
  );
}
