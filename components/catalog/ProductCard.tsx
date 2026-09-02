import Link from "next/link";
import { ProductImage } from "@/components/shared/ProductImage";
import { Price } from "@/components/shared/Price";
import { ConditionBadge } from "@/components/shared/ConditionBadge";
import { RatingStars } from "@/components/shared/RatingStars";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/types/product";

type ProductCardProps = {
  product: Product;
  /**
   * Similitud semántica, 0-1 (Fase 4.4) — prop opcional a propósito: la
   * pestaña "Resultados con IA" de `/buscar` la pasa, "Coincidencia
   * exacta" y el resto del catálogo no. El card sigue siendo el mismo
   * componente en los dos casos, nunca uno duplicado.
   */
  similarity?: number;
  /** Fase 7.2: `true` SOLO en la primera tarjeta above-the-fold de la home (`ProductGrid` la marca) — ver docs/PERFORMANCE.md. */
  priority?: boolean;
};

/**
 * `sizes` real del grid (`ProductGrid.tsx`: `grid-cols-1 sm:grid-cols-2
 * lg:grid-cols-3 xl:grid-cols-4`, dentro del `Container` `max-w-7xl` +
 * el sidebar de filtros de `220px` que `CatalogPage` agrega desde `lg:`)
 * — Fase 7.2, medido contra el layout real, no el default genérico de
 * `ProductImage` (pensado para "una imagen cualquiera", no este grid en
 * particular). Por debajo de `sm` (640px) es 1 columna = ancho completo,
 * no la mitad; por encima de `xl` (1280px) el `Container` deja de crecer
 * (`max-w-7xl`), así que el ancho real de cada tarjeta queda fijo en
 * píxeles, no en vw.
 */
const GRID_SIZES = "(min-width: 1280px) 229px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw";

/** Presentación pura: recibe el producto ya resuelto (image_url, price:number, average_rating) — no conoce Supabase. */
export function ProductCard({ product, similarity, priority }: ProductCardProps) {
  return (
    <Link
      href={`/producto/${product.id}`}
      data-testid="product-card"
      className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/50"
    >
      <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
        <ProductImage src={product.image_url} alt={product.title} sizes={GRID_SIZES} priority={priority} />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <ConditionBadge condition={product.condition} className="w-fit" />
          {similarity !== undefined ? (
            <Badge variant="outline" className="w-fit">
              {Math.round(similarity * 100)}% de coincidencia
            </Badge>
          ) : null}
        </div>
        <h3 className="line-clamp-2 text-sm font-medium text-foreground group-hover:text-primary">
          {product.title}
        </h3>
        <Price value={product.price} size="md" />
        {product.review_count > 0 ? (
          <div className="flex items-center gap-1.5">
            <RatingStars value={product.average_rating ?? 0} size="sm" />
            <span className="text-xs text-muted-foreground">({product.review_count})</span>
          </div>
        ) : null}
      </div>
    </Link>
  );
}
