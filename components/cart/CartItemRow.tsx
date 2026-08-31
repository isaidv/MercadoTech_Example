"use client";

import { Trash2 } from "lucide-react";
import { ProductImage } from "@/components/shared/ProductImage";
import { Price } from "@/components/shared/Price";
import { Button } from "@/components/ui/button";
import type { CartItemWithProduct } from "@/types/order";

type CartItemRowProps = {
  item: CartItemWithProduct;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
};

/**
 * Imagen, título, precio, cantidad editable (1..stock) y quitar. Si
 * `item.product` es `null` (RLS lo oculta: el vendedor lo desactivó) se
 * muestra como "ya no disponible" con un único botón, quitar — no tiene
 * sentido ofrecer una cantidad editable de algo que no se puede comprar.
 */
export function CartItemRow({ item, onQuantityChange, onRemove }: CartItemRowProps) {
  if (!item.product) {
    return (
      <div className="flex items-center gap-4 border-b border-border py-4 last:border-b-0">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-md">
          <ProductImage src={null} alt="Producto ya no disponible" />
        </div>
        <p className="flex-1 text-sm font-medium text-muted-foreground">
          Este producto ya no está disponible
        </p>
        <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Quitar del carrito">
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>
    );
  }

  const { product } = item;
  // Math.max cubre el caso raro donde la cantidad ya guardada superó al
  // stock actual (bajó después de agregarla): el <select> sigue mostrando
  // esa cantidad como opción válida en vez de perderla silenciosamente.
  const maxQuantity = Math.max(product.stock, item.quantity);

  return (
    <div className="flex items-center gap-4 border-b border-border py-4 last:border-b-0">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-md">
        <ProductImage src={product.image_url} alt={product.title} />
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <p className="text-sm font-medium">{product.title}</p>
        <Price value={product.price} size="sm" />
      </div>

      <select
        aria-label={`Cantidad de ${product.title}`}
        value={item.quantity}
        onChange={(event) => onQuantityChange(Number(event.target.value))}
        className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
      >
        {Array.from({ length: maxQuantity }, (_, index) => index + 1).map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>

      <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Quitar del carrito">
        <Trash2 className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
