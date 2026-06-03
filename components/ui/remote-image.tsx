"use client";

import Image, { type ImageProps } from "next/image";
import { isNextImageSrc } from "@/lib/next-image-hosts";
import { cn } from "@/lib/utils";

type RemoteImageProps = Omit<ImageProps, "src"> & {
  src: string;
};

/** `next/image` para hosts conocidos; `<img>` para URLs externas arbitrarias (admin). */
export function RemoteImage({
  src,
  alt,
  className,
  fill,
  sizes,
  priority,
  onLoad,
  ...rest
}: RemoteImageProps) {
  const resolved = src || "/placeholder.svg";

  if (isNextImageSrc(resolved)) {
    return (
      <Image
        src={resolved}
        alt={alt}
        fill={fill}
        sizes={sizes}
        priority={priority}
        className={className}
        onLoad={onLoad}
        {...rest}
      />
    );
  }

  if (fill) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolved}
        alt={alt}
        className={cn("absolute inset-0 h-full w-full object-cover", className)}
        sizes={sizes}
        onLoad={onLoad}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt}
      className={className}
      onLoad={onLoad}
    />
  );
}
