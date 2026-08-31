"use client";

import { useState, type KeyboardEvent } from "react";
import { ProductImage } from "@/components/shared/ProductImage";
import { cn } from "@/lib/utils";
import type { ProductGalleryImage } from "@/types/product";

type ProductGalleryProps = {
  /** Ya ordenadas por `position` (lo garantiza `useProduct`/`getProductImages`). */
  images: ProductGalleryImage[];
  productTitle: string;
};

/** Imagen grande + miniaturas; ←/→ cambian la imagen activa con el foco en la galería. Puro: recibe URLs ya resueltas, nunca un `image_path`. */
export function ProductGallery({ images, productTitle }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="relative aspect-square overflow-hidden rounded-lg border border-border">
        <ProductImage src={null} alt={`${productTitle} — sin imágenes disponibles`} />
      </div>
    );
  }

  const clampedIndex = Math.min(activeIndex, images.length - 1);
  const active = images[clampedIndex];

  function goTo(index: number) {
    setActiveIndex(((index % images.length) + images.length) % images.length);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(clampedIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(clampedIndex - 1);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-label={`Galería de ${productTitle}, imagen ${clampedIndex + 1} de ${images.length}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="relative aspect-square overflow-hidden rounded-lg border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ProductImage src={active.url} alt={`${productTitle} — imagen ${clampedIndex + 1} de ${images.length}`} />
      </div>

      {images.length > 1 ? (
        <div role="tablist" aria-label="Miniaturas" className="flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              role="tab"
              aria-selected={index === clampedIndex}
              onClick={() => goTo(index)}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-md border-2",
                index === clampedIndex ? "border-primary" : "border-transparent",
              )}
            >
              <ProductImage src={image.url} alt={`Miniatura ${index + 1} de ${productTitle}`} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
