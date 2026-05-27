import { FeaturedStrip } from "@/components/shop/FeaturedStrip";
import { HeroParallax } from "@/components/shop/HeroParallax";
import { HomeCta } from "@/components/shop/HomeCta";
import { fetchCatalogProducts } from "@/lib/api";

export default async function HomePage() {
  const response = await fetchCatalogProducts();
  const featured = response?.data.slice(0, 3) ?? [];

  return (
    <>
      <HeroParallax />
      {featured.length > 0 && <FeaturedStrip products={featured} />}
      <HomeCta />
    </>
  );
}
