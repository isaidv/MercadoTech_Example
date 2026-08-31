"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getItems, addItem, updateQuantity, removeItem, type CartItemWithProduct } from "@/services/cart.service";
import { checkout as checkoutService } from "@/services/order.service";
import { getErrorMessage } from "@/lib/utils";

/**
 * `{items, subtotal, count, loading, error, add, update, remove, checkout}`
 * (contrato de la Fase 3.6) + `checkingOut`/`retry` para el mismo patrón de
 * loading/error que el resto de los hooks de la app.
 *
 * `subtotal` usa el precio ACTUAL de cada producto (`item.product.price`),
 * nunca un snapshot — el snapshot recién existe después del checkout,
 * dentro de `order_items`. `count` es la suma de cantidades (unidades
 * totales), no el número de filas — así el badge del navbar coincide con
 * "cuántas cosas vas a comprar", no con "cuántos productos distintos".
 */
export function useCart(userId: string | null) {
  const router = useRouter();
  const [items, setItems] = useState<CartItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const load = useCallback(() => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getItems(userId)
      .then(setItems)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = useCallback(
    async (productId: string, quantity: number) => {
      if (!userId) return;
      try {
        await addItem(userId, productId, quantity);
        toast.success("Agregado al carrito");
        load();
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    },
    [userId, load],
  );

  const update = useCallback(async (cartItemId: string, quantity: number) => {
    // Optimista: la cantidad cambia al toque; si falla, vuelve al valor anterior.
    let previous: CartItemWithProduct[] = [];
    setItems((prev) => {
      previous = prev;
      return prev.map((item) => (item.id === cartItemId ? { ...item, quantity } : item));
    });
    try {
      await updateQuantity(cartItemId, quantity);
    } catch (err) {
      setItems(previous);
      toast.error(getErrorMessage(err));
    }
  }, []);

  const remove = useCallback(async (cartItemId: string) => {
    let previous: CartItemWithProduct[] = [];
    setItems((prev) => {
      previous = prev;
      return prev.filter((item) => item.id !== cartItemId);
    });
    try {
      await removeItem(cartItemId);
    } catch (err) {
      setItems(previous);
      toast.error(getErrorMessage(err));
    }
  }, []);

  const checkout = useCallback(async () => {
    if (!userId) return;
    setCheckingOut(true);
    try {
      const orderId = await checkoutService(userId);
      toast.success("Pedido creado");
      // El RPC ya vació cart_items — solo hace falta refrescar el estado local.
      load();
      router.push(`/pedidos/${orderId}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
      // El stock (o la actividad del producto) pudo cambiar entre que se
      // cargó el carrito y se intentó el checkout — recargar lo refleja.
      load();
    } finally {
      setCheckingOut(false);
    }
  }, [userId, load, router]);

  const subtotal = items.reduce((sum, item) => sum + (item.product ? item.product.price * item.quantity : 0), 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return { items, subtotal, count, loading, error, add, update, remove, checkout, checkingOut, retry: load };
}
