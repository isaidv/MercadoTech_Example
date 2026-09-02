"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";
import { useSellerOrders } from "@/hooks/useSellerOrders";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";

/**
 * Fase 7.2 — `dynamic import` (decisión 4; docs/PERFORMANCE.md). El
 * candidato más débil de los tres: `/vendedor/pedidos` ya era la ruta
 * más liviana de la app (263 kB) antes de este cambio — se prueba igual,
 * de bajo riesgo, y se revierte si el número no baja (regla de la fase).
 */
const OrdersKanban = dynamic(() => import("@/components/seller/OrdersKanban").then((m) => m.OrdersKanban), {
  ssr: false,
  loading: () => <LoadingState>Cargando tablero de pedidos…</LoadingState>,
});

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
