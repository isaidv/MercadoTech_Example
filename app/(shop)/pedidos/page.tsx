"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useOrders } from "@/hooks/useOrders";
import { OrderCard } from "@/components/orders/OrderCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";

export default function PedidosPage() {
  const { user, initializing } = useAuth();
  const { orders, loading, error, retry } = useOrders(user?.id ?? null);

  if (initializing || loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState description={error} onRetry={retry} />;
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        title="Todavía no tienes pedidos"
        description="Cuando compres algo, tus pedidos van a aparecer acá."
        action={<Button render={<Link href="/" />}>Explorar productos</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold">Mis pedidos</h1>
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}
