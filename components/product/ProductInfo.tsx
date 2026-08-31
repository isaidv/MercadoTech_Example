import { Price } from "@/components/shared/Price";
import { ConditionBadge } from "@/components/shared/ConditionBadge";
import type { Product } from "@/types/product";

type ProductInfoProps = {
  product: Product;
};

/** Título, marca, condición, precio y stock disponible. Puro: todo llega resuelto por props. */
export function ProductInfo({ product }: ProductInfoProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <ConditionBadge condition={product.condition} />
        {product.brand ? <span className="text-sm text-muted-foreground">{product.brand}</span> : null}
      </div>

      <h1 className="font-heading text-2xl font-semibold sm:text-3xl">{product.title}</h1>

      <Price value={product.price} size="lg" />

      <p className="text-sm text-muted-foreground">
        {product.stock > 0 ? `${product.stock} disponibles` : "Sin stock"}
      </p>

      {product.description ? (
        <p className="whitespace-pre-line text-sm text-foreground/90">{product.description}</p>
      ) : null}
    </div>
  );
}
