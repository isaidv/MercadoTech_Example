"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { ProductCard } from "@/components/catalog/ProductCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";

export default function FavoritosPage() {
  const { user, initializing } = useAuth();
  const { items, loading, error, retry } = useFavorites(user?.id ?? null);

  if (initializing || loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState description={error} onRetry={retry} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Todavía no tienes favoritos"
        description="Guarda los productos que te interesan para encontrarlos rápido después."
        action={<Button render={<Link href="/" />}>Explorar productos</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold">Mis favoritos</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
