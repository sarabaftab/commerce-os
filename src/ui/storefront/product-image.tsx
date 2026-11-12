import Image from "next/image";

import { isOptimizableMediaSrc } from "@/shared/media/allowed-media-url";
import { cn } from "@/ui/lib/utils";

type ProductImageProps = {
  src: string;
  alt: string;
  /** Intrinsic aspect for CLS — defaults to 4/3 product card. */
  className?: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
  width?: number;
  height?: number;
};

/**
 * Storefront product image with next/image when the URL is on an allowed host.
 * Falls back to a plain img for unusual/legacy schemes (AUD-009).
 */
export function ProductImage({
  src,
  alt,
  className,
  sizes = "(max-width: 640px) 50vw, 280px",
  priority = false,
  fill = true,
  width,
  height,
}: ProductImageProps) {
  if (!isOptimizableMediaSrc(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={cn("object-contain", className)} loading="lazy" />
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-contain", className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 96}
      height={height ?? 96}
      sizes={sizes}
      priority={priority}
      className={cn("object-contain", className)}
    />
  );
}
