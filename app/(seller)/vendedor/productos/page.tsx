"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useSellerProducts } from "@/hooks/useSellerProducts";
import { ProductsTable } from "@/components/seller/ProductsTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";

export default function VendedorProductosPage() {
  const { profile } = useAuth();
  const { products, loading, error, toggleActive, remove, retry } = useSellerProducts(profile?.id ?? null);

  if (loading) {
    return <LoadingState />;
  }
  if (error) {
    return <ErrorState description={error} onRetry={retry} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">Mis productos</h1>
        <Button data-testid="seller-publish-link" render={<Link href="/vendedor/publicar" />}>
          Publicar producto
        </Button>
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="Todavía no publicaste productos"
          description="Creá tu primer producto para empezar a vender."
          action={
            <Button data-testid="seller-publish-link" render={<Link href="/vendedor/publicar" />}>
              Publicar producto
            </Button>
          }
        />
      ) : (
        <ProductsTable products={products} onToggleActive={toggleActive} onDelete={remove} />
      )}
    </div>
  );
}
