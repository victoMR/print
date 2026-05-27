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
    <main className="min-h-screen">
      <Header />
      <ShopPageContent products={products} />
      <Footer />
    </main>
  );
}
