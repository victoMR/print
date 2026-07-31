/**
 * Traduce (ES -> EN) los productos existentes que aún no tienen name_en/description_en.
 * Correr una sola vez después de desplegar la migración 029_product_i18n_fields.sql.
 *
 * Uso:
 *   pnpm --filter @print/api exec tsx src/scripts/backfill-product-translations.ts
 */
import '../load-env.js';
import * as productsRepo from '../db/mrpaps-products.repository.js';
import { isTranslationConfigured, translateProductContent } from '../lib/translate.js';

const DELAY_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  if (!isTranslationConfigured()) {
    console.error('DEEPL_API_KEY no está definida — nada que hacer.');
    process.exit(1);
  }

  const products = await productsRepo.listProductsAdmin();
  const pending = products.filter((p) => p.translated_at === null);

  console.log(`${pending.length} de ${products.length} productos sin traducir.`);

  let ok = 0;
  let failed = 0;

  for (const product of pending) {
    const translation = await translateProductContent({
      name: product.name,
      description: product.description,
    });

    if (!translation.name_en && !translation.description_en) {
      failed += 1;
      console.warn(`skip ${product.slug} — traducción falló, se reintentará en la próxima corrida.`);
      await sleep(DELAY_MS);
      continue;
    }

    await productsRepo.updateProductAdmin(product.id, {
      name_en: product.name_en_is_manual ? undefined : translation.name_en ?? undefined,
      description_en: product.description_en_is_manual ? undefined : translation.description_en ?? undefined,
      translated_at: new Date().toISOString(),
    });

    ok += 1;
    console.log(`ok ${product.slug}`);
    await sleep(DELAY_MS);
  }

  console.log(`Listo: ${ok} traducidos, ${failed} pendientes de reintento.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
