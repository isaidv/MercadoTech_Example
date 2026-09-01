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
};

/** Presentación pura: recibe el producto ya resuelto (image_url, price:number, average_rating) — no conoce Supabase. */
export function ProductCard({ product, similarity }: ProductCardProps) {
  return (
    <Link
      href={`/producto/${product.id}`}
      data-testid="product-card"
      className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/50"
    >
      <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
        <ProductImage src={product.image_url} alt={product.title} />
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
