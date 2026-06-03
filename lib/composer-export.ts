import type {
  GarmentTemplateView,
  ProductComposition,
  ProductPlacement,
} from "./api-types";
import {
  cropPixelRect,
  printAreaInCropSpace,
} from "./mockup-layout";

export type ComposerPlacement = ProductPlacement & {
  localId: string;
};

const DPI = 300;

/** Mockups SVG de camiseta/gorra retirados; evita 404 en tienda/admin. */
export function isUnavailableMockupUrl(url: string): boolean {
  if (!url) return true;
  return (
    url.includes("/plantillas/camiseta/") ||
    url.includes("/plantillas/gorras/") ||
    (url.includes("/plantillas/") && url.endsWith(".svg"))
  );
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  if (isUnavailableMockupUrl(src)) {
    return Promise.reject(new Error(`Mockup no disponible: ${src}`));
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    if (src.startsWith("http://") || src.startsWith("https://")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar: ${src}`));
    img.src = src;
  });
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = hex.replace("#", "");
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

const FABRIC_LINE_LUM = 85;
const MIN_ALPHA = 48;

function pixelLum(data: Uint8ClampedArray, px: number): number {
  const o = px * 4;
  return 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
}

function isFabricWalkable(data: Uint8ClampedArray, px: number): boolean {
  const o = px * 4;
  if (data[o + 3] < MIN_ALPHA) return false;
  return pixelLum(data, px) >= FABRIC_LINE_LUM;
}

/** Regiones de tela: componentes conectados grandes (cuerpo, capucha, mangas). */
function buildFabricMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8Array {
  const mask = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);
  const minComponent = 500;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const start = y * width + x;
      if (visited[start] || !isFabricWalkable(data, start)) continue;

      const queue = [start];
      const component: number[] = [];
      visited[start] = 1;

      while (queue.length > 0) {
        const px = queue.pop()!;
        component.push(px);
        const cx = px % width;
        const cy = (px / width) | 0;

        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const ni = ny * width + nx;
          if (visited[ni] || !isFabricWalkable(data, ni)) continue;
          visited[ni] = 1;
          queue.push(ni);
        }
      }

      if (component.length >= minComponent) {
        for (const px of component) mask[px] = 1;
      }
    }
  }

  return mask;
}

function prepareMockupLayer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const d = imageData.data;
  const mask = buildFabricMask(d, width, height);
  const tint = color.toUpperCase() !== "#FFFFFF";
  const { r: tr, g: tg, b: tb } = tint ? hexToRgb(color) : { r: 0, g: 0, b: 0 };

  for (let px = 0; px < width * height; px++) {
    const o = px * 4;
    const a = d[o + 3];
    if (a < MIN_ALPHA) continue;

    const lum = pixelLum(d, px);

    if (mask[px]) {
      if (!tint) continue;
      const shade = lum / 255;
      const factor = 0.4 + 0.6 * shade;
      d[o] = Math.round(Math.min(255, tr * factor));
      d[o + 1] = Math.round(Math.min(255, tg * factor));
      d[o + 2] = Math.round(Math.min(255, tb * factor));
      continue;
    }

    // Halos claros fuera de la silueta → transparente (fondo UI sin teñir)
    if (lum >= FABRIC_LINE_LUM) {
      d[o + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

export async function drawCroppedMockupBase(
  ctx: CanvasRenderingContext2D,
  view: GarmentTemplateView,
  garmentColor: string,
  width: number,
  height: number,
): Promise<void> {
  const mockup = await loadImage(view.mockupUrl);
  const crop = cropPixelRect(view, mockup.width, mockup.height);

  // Paso 1: mockup solo (sin fondo UI) → teñir tela
  const layer = document.createElement("canvas");
  layer.width = width;
  layer.height = height;
  const lctx = layer.getContext("2d");
  if (!lctx) throw new Error("Canvas no disponible");

  lctx.clearRect(0, 0, width, height);
  lctx.drawImage(mockup, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
  prepareMockupLayer(lctx, width, height, garmentColor);

  // Paso 2: fondo neutro + prenda encima (transparente fuera de la ropa)
  ctx.fillStyle = "#f4f4f5";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(layer, 0, 0);
}

async function drawPlacements(
  ctx: CanvasRenderingContext2D,
  view: GarmentTemplateView,
  canvasWidth: number,
  canvasHeight: number,
  placements: ComposerPlacement[],
  designUrls: Map<string, string>,
  options?: { printOnly?: boolean },
) {
  const area = view.printArea;
  const areaX = area.x * canvasWidth;
  const areaY = area.y * canvasHeight;
  const areaW = area.width * canvasWidth;
  const areaH = area.height * canvasHeight;

  if (options?.printOnly) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  for (const placement of placements) {
    const url = designUrls.get(placement.designId);
    if (!url) continue;
    const design = await loadImage(url);
    const dw = placement.width * areaW;
    const dh = (design.height / design.width) * dw;
    const dx = areaX + placement.x * areaW;
    const dy = areaY + placement.y * areaH;

    ctx.save();
    ctx.translate(dx + dw / 2, dy + dh / 2);
    ctx.rotate((placement.rotation * Math.PI) / 180);
    ctx.drawImage(design, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }
}

export async function exportMockupPreview(options: {
  view: GarmentTemplateView;
  garmentColor: string;
  placements: ComposerPlacement[];
  designUrls: Map<string, string>;
  maxWidth?: number;
}): Promise<Blob> {
  const mockup = await loadImage(options.view.mockupUrl);
  const crop = cropPixelRect(options.view, mockup.width, mockup.height);
  const maxWidth = options.maxWidth ?? 1200;
  const scale = maxWidth / crop.width;
  const width = Math.round(crop.width * scale);
  const height = Math.round(crop.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");

  await drawCroppedMockupBase(ctx, options.view, options.garmentColor, width, height);

  const cropView: GarmentTemplateView = {
    ...options.view,
    printArea: printAreaInCropSpace(options.view),
  };

  await drawPlacements(
    ctx,
    cropView,
    width,
    height,
    options.placements,
    options.designUrls,
  );

  return canvasToBlob(canvas);
}

/** Archivo de impresión @ 300 DPI — solo el arte, sin mockup. */
export async function exportPrintFile(options: {
  view: GarmentTemplateView;
  placements: ComposerPlacement[];
  designUrls: Map<string, string>;
  dpi?: number;
}): Promise<Blob> {
  const dpi = options.dpi ?? DPI;
  const width = Math.round(options.view.printWidthIn * dpi);
  const height = Math.round(options.view.printHeightIn * dpi);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");

  const fullView: GarmentTemplateView = {
    ...options.view,
    printArea: { x: 0, y: 0, width: 1, height: 1 },
  };

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const scaledPlacements = options.placements.map((p) => ({
    ...p,
    x: options.view.printArea.x + p.x * options.view.printArea.width,
    y: options.view.printArea.y + p.y * options.view.printArea.height,
    width: p.width * options.view.printArea.width,
  }));

  await drawPlacements(
    ctx,
    fullView,
    width,
    height,
    scaledPlacements,
    options.designUrls,
    { printOnly: true },
  );

  return canvasToBlob(canvas);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Exportación fallida"))),
      "image/png",
      1,
    );
  });
}

/** Misma vista que mockup en tienda y archivo de impresión en pedidos. */
export function pickPrimaryViewId(
  templateViews: Array<{ id: string }>,
  composition: Pick<ProductComposition, "primaryPrintView" | "views">,
): string | null {
  const views = composition.views ?? {};
  const preferred = composition.primaryPrintView ?? "front";
  if ((views[preferred]?.placements?.length ?? 0) > 0) return preferred;
  for (const tv of templateViews) {
    if ((views[tv.id]?.placements?.length ?? 0) > 0) return tv.id;
  }
  return Object.keys(views).find((k) => (views[k]?.placements?.length ?? 0) > 0) ?? null;
}

export function toProductComposition(
  templateId: string,
  garmentColor: string,
  viewPlacements: Record<string, ComposerPlacement[]>,
  designUrls: Map<string, string>,
  printFileUrls?: Record<string, string>,
  primaryPrintView?: string,
): ProductComposition {
  const views: ProductComposition["views"] = {};
  for (const [viewId, placements] of Object.entries(viewPlacements)) {
    if (placements.length === 0) continue;
    views[viewId] = {
      placements: placements.map(({ designId, x, y, width, rotation }) => ({
        designId,
        designUrl: designUrls.get(designId),
        x,
        y,
        width,
        rotation,
      })),
      ...(printFileUrls?.[viewId] ? { printFileUrl: printFileUrls[viewId] } : {}),
    };
  }
  const primary =
    primaryPrintView && views[primaryPrintView]
      ? primaryPrintView
      : (Object.keys(views).includes("front") ? "front" : Object.keys(views)[0]) ?? "front";

  return {
    templateId,
    garmentColor,
    primaryPrintView: primary,
    views,
  };
}

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function fromProductComposition(
  composition: ProductComposition,
): Record<string, ComposerPlacement[]> {
  const result: Record<string, ComposerPlacement[]> = {};
  for (const [viewId, viewData] of Object.entries(composition.views ?? {})) {
    result[viewId] = viewData.placements.map((p) => ({
      ...p,
      localId: crypto.randomUUID(),
    }));
  }
  return result;
}

export function centerPlacement(p: ComposerPlacement): ComposerPlacement {
  return {
    ...p,
    x: (1 - p.width) / 2,
    y: (1 - p.width * 0.75) / 2,
  };
}
