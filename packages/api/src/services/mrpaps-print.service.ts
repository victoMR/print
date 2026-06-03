import type { MrpapsProductRow, MrpapsProductVariantRow } from '../db/mrpaps.types.js';
import * as designsRepo from '../db/mrpaps-designs.repository.js';

type CompositionView = {
  printFileUrl?: string;
  placements?: unknown[];
};

type ProductComposition = {
  views?: Record<string, CompositionView>;
  primaryPrintView?: string;
};

const VIEW_PRIORITY = ['front', 'back'];

/** Archivo de impresión de la misma vista que `primaryPrintView` / mockup del producto. */
export function resolvePrintFileFromComposition(
  composition: ProductComposition | null | undefined,
): string | null {
  const views = composition?.views;
  if (!views) return null;

  const preferred = composition.primaryPrintView ?? 'front';
  if (views[preferred]?.printFileUrl) return views[preferred].printFileUrl!;

  const ordered = [
    ...VIEW_PRIORITY,
    ...Object.keys(views),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  for (const viewId of ordered) {
    const url = views[viewId]?.printFileUrl;
    if (url) return url;
  }

  return null;
}

export async function resolvePrintFileUrl(
  product: MrpapsProductRow,
  variant: MrpapsProductVariantRow,
): Promise<string | null> {
  const composition = product.composition as ProductComposition | null | undefined;
  const fromComposition = resolvePrintFileFromComposition(composition);
  if (fromComposition) return fromComposition;

  // Solo productos antiguos sin exportación en composición
  if (variant.design_id) {
    const design = await designsRepo.getDesignById(variant.design_id);
    return design?.file_url ?? null;
  }

  return null;
}
