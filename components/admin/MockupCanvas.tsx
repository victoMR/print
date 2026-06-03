"use client";

import { useEffect, useRef } from "react";
import type { GarmentTemplateView } from "@/lib/api-types";
import { drawCroppedMockupBase } from "@/lib/composer-export";

type MockupCanvasProps = {
  view: GarmentTemplateView;
  garmentColor: string;
};

export function MockupCanvas({ view, garmentColor }: MockupCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let cancelled = false;

    function paint() {
      if (cancelled || !container || !canvas) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      void drawCroppedMockupBase(ctx, view, garmentColor, w, h).catch(() => {
        ctx.fillStyle = "#f4f4f5";
        ctx.fillRect(0, 0, w, h);
      });
    }

    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(container);

    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, [view, garmentColor]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block w-full h-full pointer-events-none" />
    </div>
  );
}
