"use client";

import { useCallback, useEffect, useState } from "react";
import { listMyOrders, getOrderById, cancelIfPending, type OrderWithItems } from "@/services/order.service";
import { getErrorMessage } from "@/lib/utils";
import type { Order } from "@/types/order";

/** Lista de pedidos del comprador, para /pedidos. */
export function useOrders(userId: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    listMyOrders(userId)
      .then(setOrders)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { orders, loading, error, retry: load };
}

/** Detalle + cancel, para /pedidos/[id]. Mismo archivo que useOrders (misma fuente: order.service.ts). */
export function useOrder(orderId: string) {
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getOrderById(orderId)
      .then(setOrder)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const cancel = useCallback(async () => {
    setCancelling(true);
    try {
      await cancelIfPending(orderId);
      setOrder((prev) => (prev ? { ...prev, status: "cancelado" } : prev));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  }, [orderId]);

  return { order, loading, error, cancelling, cancel, retry: load };
}
