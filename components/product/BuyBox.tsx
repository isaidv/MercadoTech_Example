"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BuyBoxProps = {
  stock: number;
  isActive: boolean;
  isOwner: boolean;
  isAuthenticated: boolean;
  favorite: boolean;
  favoriteLoading?: boolean;
  onToggleFavorite?: () => void;
  /** "Agregar al carrito" queda como callback: el carrito real se conecta en la Fase 3.6 (useCart) — acá no se crea cart.service ni useCart. */
  onAddToCart?: (quantity: number) => void;
};

/**
 * Deshabilitado con el motivo visible: "Sin stock", "Es tu propio
 * producto" — o, sin sesión, el CTA principal se convierte en un link a
 * /login en vez de deshabilitarse ("Inicia sesión para comprar"). Un
 * producto inactivo solo es visible para su propio dueño o un admin (RLS
 * `products_select_active_or_own`) — el caso "inactivo pero no soy el
 * dueño" es, por diseño, irrepresentable para un comprador normal; se
 * cubre igual acá por defensa en profundidad (ej. un admin mirando el
 * producto de otro vendedor).
 */
export function BuyBox({
  stock,
  isActive,
  isOwner,
  isAuthenticated,
  favorite,
  favoriteLoading,
  onToggleFavorite,
  onAddToCart,
}: BuyBoxProps) {
  const [quantity, setQuantity] = useState(1);
  const canBuy = isAuthenticated && isActive && !isOwner && stock > 0;

  const disabledReason = !isActive
    ? "Este producto ya no está disponible"
    : isOwner
      ? "Es tu propio producto"
      : stock <= 0
        ? "Sin stock"
        : null;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      {canBuy ? (
        <div className="flex items-center gap-2">
          <label htmlFor="buybox-quantity" className="text-sm font-medium">
            Cantidad
          </label>
          <select
            id="buybox-quantity"
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            {Array.from({ length: stock }, (_, index) => index + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {!isAuthenticated ? (
        <Button render={<Link href="/login" />}>Inicia sesión para comprar</Button>
      ) : (
        <Button disabled={!canBuy} onClick={() => onAddToCart?.(quantity)}>
          {canBuy ? "Agregar al carrito" : disabledReason}
        </Button>
      )}

      <Button
        variant="outline"
        className="gap-2"
        disabled={!isAuthenticated || favoriteLoading}
        onClick={onToggleFavorite}
      >
        <Heart className={cn("size-4", favorite && "fill-destructive text-destructive")} aria-hidden="true" />
        {favorite ? "Guardado en favoritos" : "Guardar en favoritos"}
      </Button>
    </div>
  );
}
