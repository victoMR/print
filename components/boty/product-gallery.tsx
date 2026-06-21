"use client";

import { useEffect, useState } from "react";
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
  const gallery = images.filter(Boolean);
  const [activeIndex, setActiveIndex] = useState(0);
  const galleryKey = gallery.join("|");

  useEffect(() => {
    setActiveIndex(0);
  }, [galleryKey]);

  if (gallery.length === 0) {
    return (
      <div className={cn("relative aspect-square rounded-3xl overflow-hidden bg-card boty-shadow", className)}>
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

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative aspect-square rounded-3xl overflow-hidden bg-card boty-shadow">
        <RemoteImage
          key={active}
          src={active}
          alt={`${alt} — foto ${activeIndex + 1}`}
          fill
          className="object-cover"
          priority={priority && activeIndex === 0}
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>

      {gallery.length > 1 && (
        <div
          className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory"
          role="tablist"
          aria-label="Galería del producto"
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
                "relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 boty-transition snap-start",
                index === activeIndex
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <RemoteImage
                src={url}
                alt=""
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
