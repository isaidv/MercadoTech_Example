"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useSellerOrders } from "@/hooks/useSellerOrders";
import { OrdersKanban } from "@/components/seller/OrdersKanban";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";

export default function VendedorPedidosPage() {
  const { profile } = useAuth();
  const { orders, columns, loading, error, move, retry } = useSellerOrders(profile?.id ?? null);

  if (loading) {
    return <LoadingState />;
  }
  if (error) {
    return <ErrorState description={error} onRetry={retry} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold">Pedidos</h1>
      {orders.length === 0 ? (
        <EmptyState
          title="Todavía no tienes pedidos"
          description="Los pedidos con tus productos van a aparecer acá."
          action={<Button render={<Link href="/vendedor/productos" />}>Ver mis productos</Button>}
        />
      ) : (
        <OrdersKanban columns={columns} onMove={move} />
      )}
    </div>
  );
}
