import type { CSSProperties } from "react";
import type { GarmentTemplateView } from "./api-types";

export type NormalizedRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function getContentBounds(view: GarmentTemplateView): NormalizedRect {
  if (view.contentBounds) return view.contentBounds;
  return { x: 0, y: 0, width: 1, height: 1 };
}

/** Área de impresión expresada dentro del recorte de prenda (0–1). */
export function printAreaInCropSpace(view: GarmentTemplateView): NormalizedRect {
  const cb = getContentBounds(view);
  const pa = view.printArea;
  return {
    x: (pa.x - cb.x) / cb.width,
    y: (pa.y - cb.y) / cb.height,
    width: pa.width / cb.width,
    height: pa.height / cb.height,
  };
}

export function mockupAspectRatio(view: GarmentTemplateView): number {
  const cb = getContentBounds(view);
  const mw = view.mockupWidth ?? 1402;
  const mh = view.mockupHeight ?? 1122;
  return (cb.width * mw) / (cb.height * mh);
}

export function cropImageStyle(view: GarmentTemplateView): CSSProperties {
  const cb = getContentBounds(view);
  return {
    position: "absolute",
    width: `${100 / cb.width}%`,
    height: `${100 / cb.height}%`,
    left: `${(-cb.x / cb.width) * 100}%`,
    top: `${(-cb.y / cb.height) * 100}%`,
    maxWidth: "none",
  };
}

export function loadMockupDimensions(
  mockupUrl: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error(`No se pudo cargar mockup: ${mockupUrl}`));
    img.src = mockupUrl;
  });
}

export function cropPixelRect(
  view: GarmentTemplateView,
  imageWidth: number,
  imageHeight: number,
): { x: number; y: number; width: number; height: number } {
  const cb = getContentBounds(view);
  return {
    x: Math.round(imageWidth * cb.x),
    y: Math.round(imageHeight * cb.y),
    width: Math.round(imageWidth * cb.width),
    height: Math.round(imageHeight * cb.height),
  };
}
