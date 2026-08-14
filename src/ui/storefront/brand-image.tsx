import Image from "next/image";

import { cn } from "@/ui/lib/utils";

type BrandImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
};

/**
 * Local/static brand assets via next/image. Falls back to img for non-standard URLs.
 */
export function BrandImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
}: BrandImageProps) {
  const optimizable =
    src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://");

  if (!optimizable) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={cn("object-contain", className)}
        loading={priority ? "eager" : "lazy"}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={cn("object-contain", className)}
    />
  );
}
