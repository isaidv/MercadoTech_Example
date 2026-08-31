"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { CartItemRow } from "@/components/cart/CartItemRow";
import { CartSummary } from "@/components/cart/CartSummary";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";

export default function CarritoPage() {
  const { user, initializing } = useAuth();
  const { items, subtotal, loading, error, update, remove, checkout, checkingOut, retry } = useCart(
    user?.id ?? null,
  );

  if (initializing || loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState description={error} onRetry={retry} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Tu carrito está vacío"
        description="Agrega productos para verlos acá."
        action={<Button render={<Link href="/" />}>Explorar productos</Button>}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col">
        {items.map((item) => (
          <CartItemRow
            key={item.id}
            item={item}
            onQuantityChange={(quantity) => update(item.id, quantity)}
            onRemove={() => remove(item.id)}
          />
        ))}
      </div>

      <CartSummary subtotal={subtotal} loading={checkingOut} onCheckout={checkout} />
    </div>
  );
}
