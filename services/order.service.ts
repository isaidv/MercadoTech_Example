import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Order, OrderItem } from "@/types/order";
import type { OrderStatus } from "@/lib/constants/roles";

type Client = SupabaseClient<Database>;

// Exportados: services/seller.service.ts (listMyOrders) arma pedidos
// agrupados a partir de order_items en vez de orders, pero reutiliza el
// mismo mapeo numeric-as-string (ver TRAMPA de PostgREST en types/order.ts)
// en vez de duplicarlo.
export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];

export function mapOrderRow(row: OrderRow): Order {
  return {
    id: row.id,
    buyer_id: row.buyer_id,
    status: row.status as OrderStatus,
    total: Number(row.total),
    created_at: row.created_at,
  };
}

export function mapOrderItemRow(row: OrderItemRow): OrderItem {
  return { ...row, price_snapshot: Number(row.price_snapshot) };
}

/**
 * Checkout SIMULADO: llama al RPC transaccional `create_order_from_cart`
 * de la sesión 2 (20260821101700_create_checkout_function.sql) — NUNCA
 * inserta en `orders` directamente. No hay policy de INSERT para `orders`
 * a propósito (ver RLS): el único camino es este RPC, `security definer`,
 * que valida `p_buyer_id = auth.uid()` él mismo. No se pide ni se guarda
 * ningún dato de tarjeta — el "cobro" no existe, la función solo mueve
 * filas entre `cart_items`, `orders`, `order_items` y descuenta `stock`.
 *
 * Devuelve el `id` del pedido creado. Si el RPC lanza una excepción (carrito
 * vacío, producto inactivo, stock insuficiente), Postgres revierte TODA la
 * transacción — ningún `order`/`order_item` queda a medias y `cart_items`
 * no se toca — y ese mensaje llega acá tal cual en `error.message`.
 */
export async function checkout(userId: string, supabase: Client = createClient()): Promise<string> {
  const { data, error } = await supabase.rpc("create_order_from_cart", { p_buyer_id: userId });
  if (error) throw error;
  return data;
}

export async function listMyOrders(userId: string, supabase: Client = createClient()): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("buyer_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as OrderRow[]).map(mapOrderRow);
}

export type OrderWithItems = Order & { items: OrderItem[] };

/**
 * Si el pedido no es del usuario autenticado (ni tiene ítems suyos como
 * vendedor, ni es admin), `orders_select_buyer_seller_or_admin` devuelve 0
 * filas — `.single()` lo convierte en un error de Postgrest que el hook
 * traduce a `ErrorState`, sin necesitar ningún chequeo manual de "es tuyo".
 */
export async function getOrderById(id: string, supabase: Client = createClient()): Promise<OrderWithItems> {
  const { data, error } = await supabase.from("orders").select("*, order_items(*)").eq("id", id).single();
  if (error) throw error;

  const { order_items, ...orderRow } = data as OrderRow & { order_items: OrderItemRow[] };
  return { ...mapOrderRow(orderRow), items: order_items.map(mapOrderItemRow) };
}

/**
 * `update ... where status = 'pendiente'` — si el pedido ya no está
 * pendiente, el filtro no matchea ninguna fila y el UPDATE no hace nada
 * (sin error). La UI ya oculta el botón fuera de 'pendiente' (defensa en
 * profundidad); la RLS (`orders_update_buyer` + trigger
 * `validate_order_status_transition`) es la barrera real. NO restaura
 * stock (decisión 11) — no hay trigger para eso, fuera de alcance de esta
 * sesión.
 */
export async function cancelIfPending(id: string, supabase: Client = createClient()): Promise<void> {
  const { error } = await supabase.from("orders").update({ status: "cancelado" }).eq("id", id).eq("status", "pendiente");
  if (error) throw error;
}
