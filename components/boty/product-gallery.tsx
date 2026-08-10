"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { RemoteImage } from "@/components/ui/remote-image";
import { cn } from "@/lib/utils";

type ProductGalleryProps = {
  images: string[];
  alt: string;
  className?: string;
  priority?: boolean;
};

export function ProductGallery({
  images,
  alt,
  className,
  priority = false,
}: ProductGalleryProps) {
  const t = useTranslations("shop.productDetail");
  const gallery = images.filter(Boolean);
  const [activeIndex, setActiveIndex] = useState(0);
  const galleryKey = gallery.join("|");

  useEffect(() => {
    setActiveIndex(0);
  }, [galleryKey]);

  if (gallery.length === 0) {
    return (
      <div className={cn("relative aspect-square overflow-hidden bg-[#EBE7DB]", className)}>
        <RemoteImage
          src="/placeholder.svg"
          alt={alt}
          fill
          className="object-cover"
          priority={priority}
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>
    );
  }

  const active = gallery[Math.min(activeIndex, gallery.length - 1)];

  if (gallery.length === 1) {
    return (
      <div className={cn("relative aspect-[4/5] overflow-hidden bg-[#EBE7DB]", className)}>
        <RemoteImage
          src={active}
          alt={alt}
          fill
          className="object-cover"
          priority={priority}
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>
    );
  }

  return (
    <div className={cn("flex gap-3", className)}>
      {/* Vertical thumbnails strip */}
      <div
        className="flex flex-col gap-2 overflow-y-auto"
        style={{ width: "72px", maxHeight: "600px" }}
        role="tablist"
        aria-label={t("galleryAriaLabel")}
      >
        {gallery.map((url, index) => (
          <button
            key={`${url}-${index}`}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            aria-label={`Ver foto ${index + 1}`}
            onClick={() => setActiveIndex(index)}
            className={cn(
              "relative shrink-0 w-[68px] h-[68px] overflow-hidden border boty-transition",
              index === activeIndex
                ? "border-[#2A2726]"
                : "border-transparent opacity-50 hover:opacity-80",
            )}
          >
            <RemoteImage
              src={url}
              alt=""
              fill
              className="object-cover"
              sizes="72px"
            />
          </button>
        ))}
      </div>

      {/* Main image */}
      <div className="relative flex-1 aspect-[4/5] overflow-hidden bg-[#EBE7DB]">
        <RemoteImage
          key={active}
          src={active}
          alt={`${alt} — foto ${activeIndex + 1}`}
          fill
          className="object-cover"
          priority={priority && activeIndex === 0}
          sizes="(max-width: 1024px) 100vw, 45vw"
        />
      </div>
    </div>
  );
}
