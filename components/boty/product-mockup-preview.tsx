"use client";

import { useEffect, useMemo, useState } from "react";
import type { GarmentTemplateView, ProductComposition, ProductPreviewData } from "@/lib/api-types";
import {
  exportMockupPreview,
  isUnavailableMockupUrl,
  pickPrimaryViewId,
  type ComposerPlacement,
} from "@/lib/composer-export";
import { cn } from "@/lib/utils";

type ProductMockupPreviewProps = {
  preview: ProductPreviewData;
  fallbackThumbnail: string;
  alt: string;
  className?: string;
  /** Color de prenda de la variante seleccionada (hex). */
  garmentColorOverride?: string;
};

function pickPrimaryView(
  templateViews: GarmentTemplateView[],
  composition: ProductComposition,
): GarmentTemplateView | null {
  const viewId = pickPrimaryViewId(templateViews, composition);
  return templateViews.find((v) => v.id === viewId) ?? templateViews[0] ?? null;
}

export function ProductMockupPreview({
  preview,
  fallbackThumbnail,
  alt,
  className,
  garmentColorOverride,
}: ProductMockupPreviewProps) {
  const garmentColor = garmentColorOverride ?? preview.garmentColor;
  const [src, setSrc] = useState(fallbackThumbnail);
  const [failed, setFailed] = useState(false);

  const view = useMemo(
    () => pickPrimaryView(preview.template.views, preview.composition),
    [preview],
  );

  const placements = useMemo((): ComposerPlacement[] => {
    if (!view) return [];
    const viewData = preview.composition.views[view.id];
    if (!viewData) return [];
    return viewData.placements.map((p) => ({
      ...p,
      localId: p.designId,
    }));
  }, [preview, view]);

  const designUrls = useMemo(() => {
    const map = new Map<string, string>();
    for (const viewData of Object.values(preview.composition.views ?? {})) {
      for (const p of viewData.placements) {
        if (p.designUrl) map.set(p.designId, p.designUrl);
      }
    }
    return map;
  }, [preview]);

  useEffect(() => {
    if (!view || placements.length === 0 || failed || isUnavailableMockupUrl(view.mockupUrl)) {
      setSrc(fallbackThumbnail);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      try {
        const blob = await exportMockupPreview({
          view,
          garmentColor,
          placements,
          designUrls,
          maxWidth: 900,
        });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (!cancelled) {
          setFailed(true);
          setSrc(fallbackThumbnail);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [view, placements, designUrls, garmentColor, fallbackThumbnail, failed]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn(className, "bg-muted/30")}
    />
  );
}
