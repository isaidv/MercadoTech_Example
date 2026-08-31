"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { listMyOrders, updateOrderStatus } from "@/services/seller.service";
import { getErrorMessage } from "@/lib/utils";
import { ORDER_STATUS_FLOW } from "@/lib/constants/orders";
import type { OrderStatus } from "@/lib/constants/roles";
import type { SellerOrder } from "@/types/order";

/** Un paso adelante en ORDER_STATUS_FLOW — ver EJEMPLOS de la Fase 3.7. Nunca acepta 'cancelado' como destino: el vendedor no puede cancelar (RLS lo confirma, ver reasoning). */
function canMove(from: OrderStatus, to: OrderStatus): boolean {
  const fromIndex = ORDER_STATUS_FLOW.indexOf(from);
  const toIndex = ORDER_STATUS_FLOW.indexOf(to);
  return fromIndex !== -1 && toIndex === fromIndex + 1;
}

const EMPTY_COLUMNS: Record<OrderStatus, SellerOrder[]> = {
  pendiente: [],
  pagado: [],
  enviado: [],
  entregado: [],
  cancelado: [],
};

function groupByStatus(orders: SellerOrder[]): Record<OrderStatus, SellerOrder[]> {
  const columns: Record<OrderStatus, SellerOrder[]> = {
    pendiente: [],
    pagado: [],
    enviado: [],
    entregado: [],
    cancelado: [],
  };
  for (const order of orders) {
    columns[order.status].push(order);
  }
  return columns;
}

/** Pedidos agrupados por estado (para el kanban) + move con validación de transición, actualización optimista y rollback. */
export function useSellerOrders(sellerId: string | null) {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!sellerId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    listMyOrders(sellerId)
      .then(setOrders)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [sellerId]);

  useEffect(() => {
    load();
  }, [load]);

  const move = useCallback(
    async (orderId: string, toStatus: OrderStatus) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;

      if (!canMove(order.status, toStatus)) {
        // Rechazada ACÁ, antes de llamar al service — sin roundtrip.
        toast.error(`No se puede mover un pedido de "${order.status}" a "${toStatus}" directamente.`);
        return;
      }

      const previous = orders;
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: toStatus } : o)));
      try {
        await updateOrderStatus(orderId, toStatus as "pagado" | "enviado" | "entregado");
      } catch (err) {
        setOrders(previous);
        toast.error(getErrorMessage(err));
      }
    },
    [orders],
  );

  const columns = orders.length > 0 ? groupByStatus(orders) : EMPTY_COLUMNS;

  return { orders, columns, loading, error, move, retry: load };
}
