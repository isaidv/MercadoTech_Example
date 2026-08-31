"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

type ProductImageProps = {
  /** URL pública ya resuelta (nunca el path crudo) — o `null` si el producto no tiene imágenes. */
  src: string | null;
  /** Obligatorio a propósito: nunca una imagen de producto sin alt significativo. */
  alt: string;
  className?: string;
  sizes?: string;
  /** `true` (default): ocupa el contenedor padre (requiere `position: relative` en el padre). */
  fill?: boolean;
  width?: number;
  height?: number;
};

/**
 * Wrapper de `next/image` para fotos de producto. El seed de la Fase 2.5
 * documenta a propósito que sus paths NO tienen archivo real en Storage
 * todavía (404 esperado) — por eso cualquier fallo de carga, y no solo
 * `src === null`, cae al mismo placeholder en vez de mostrar un ícono roto.
 */
export function ProductImage({
  src,
  alt,
  className,
  sizes,
  fill = true,
  width,
  height,
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className
        )}
      >
        <ImageOff className="size-6" aria-hidden="true" />
      </div>
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes ?? "(min-width: 1024px) 25vw, 50vw"}
        className={cn("object-cover", className)}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 400}
      height={height ?? 400}
      sizes={sizes}
      className={cn("object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
