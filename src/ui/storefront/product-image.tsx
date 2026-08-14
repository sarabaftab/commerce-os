import Image from "next/image";

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

function isOptimizableSrc(src: string) {
  return src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://");
}

/**
 * Storefront product image with next/image when the URL is optimizable.
 * Falls back to a plain img for unusual schemes so existing URLs never break.
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
  if (!isOptimizableSrc(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={cn("object-cover", className)} loading="lazy" />
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
        className={cn("object-cover", className)}
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
      className={cn("object-cover", className)}
    />
  );
}
