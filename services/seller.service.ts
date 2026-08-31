import { createClient } from "@/lib/supabase/client";
import { mapProductRow, PRODUCT_SELECT, type ProductQueryRow } from "@/services/product.service";
import { mapOrderRow, mapOrderItemRow, type OrderRow, type OrderItemRow } from "@/services/order.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Product } from "@/types/product";
import type { SellerOrder } from "@/types/order";
import type { ProductCondition } from "@/lib/constants/roles";

type Client = SupabaseClient<Database>;

/**
 * Incluye los INACTIVOS del propio vendedor — a diferencia de
 * `product.service.listActiveProducts` (catálogo público), acá NO se
 * filtra `is_active`: `products_select_active_or_own` ya deja ver al
 * dueño sus propios productos sea cual sea su estado, y la tabla del
 * vendedor necesita mostrarlos todos para poder reactivarlos.
 */
export async function listMyProducts(sellerId: string, supabase: Client = createClient()): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ProductQueryRow[]).map(mapProductRow);
}

export type ProductInput = {
  sellerId: string;
  categoryId: string;
  title: string;
  description: string | null;
  brand: string | null;
  condition: ProductCondition;
  price: number;
  stock: number;
};

export async function createProduct(
  input: ProductInput,
  supabase: Client = createClient(),
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("products")
    .insert({
      seller_id: input.sellerId,
      category_id: input.categoryId,
      title: input.title,
      description: input.description,
      brand: input.brand,
      condition: input.condition,
      price: input.price,
      stock: input.stock,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(
  productId: string,
  input: Omit<ProductInput, "sellerId">,
  supabase: Client = createClient(),
): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update({
      category_id: input.categoryId,
      title: input.title,
      description: input.description,
      brand: input.brand,
      condition: input.condition,
      price: input.price,
      stock: input.stock,
    })
    .eq("id", productId);
  if (error) throw error;
}

export async function toggleActive(
  productId: string,
  isActive: boolean,
  supabase: Client = createClient(),
): Promise<void> {
  const { error } = await supabase.from("products").update({ is_active: isActive }).eq("id", productId);
  if (error) throw error;
}

/**
 * `order_items.product_id` es `ON DELETE SET NULL`, NO `ON DELETE RESTRICT`
 * (ver 20260821100900_create_order_items.sql: el comentario de esa
 * migración dice explícitamente que es a propósito, para que el historial
 * sobreviva al borrado del producto). Por eso borrar un producto con
 * ventas NUNCA lanza un error de FK (23503) — Postgres simplemente
 * desvincula `order_items.product_id` a `null` y deja el DELETE seguir.
 * El chequeo "tiene ventas, no se puede borrar" se hace ACÁ, en la capa de
 * aplicación, ANTES de intentar el DELETE — no hay ningún error de base de
 * datos que capturar, a diferencia de lo que asumía originalmente esta fase.
 */
export async function deleteProduct(productId: string, supabase: Client = createClient()): Promise<void> {
  const { count, error: countError } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);
  if (countError) throw countError;

  if (count && count > 0) {
    throw new Error("Este producto tiene ventas; desactívalo en lugar de eliminarlo.");
  }

  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) throw error;
}

/**
 * Pedidos con AL MENOS un ítem de este vendedor, agrupados por pedido —
 * `items` de cada uno trae SOLO sus propios ítems (ver `SellerOrder` en
 * types/order.ts). Un pedido multi-vendedor (ej. c0000000-...-003 del seed)
 * aparece una sola vez acá, con únicamente los ítems de este vendedor
 * adentro; RLS de `order_items` ya filtra el resto, así que ni siquiera
 * llegan en la respuesta.
 */
export async function listMyOrders(sellerId: string, supabase: Client = createClient()): Promise<SellerOrder[]> {
  const { data, error } = await supabase
    .from("order_items")
    .select("*, orders!inner(id, buyer_id, status, total, created_at)")
    .eq("seller_id", sellerId);
  if (error) throw error;

  const byOrderId = new Map<string, SellerOrder>();
  for (const row of data as (OrderItemRow & { orders: OrderRow })[]) {
    const { orders: orderRow, ...itemRow } = row;
    const item = mapOrderItemRow(itemRow);
    const existing = byOrderId.get(orderRow.id);
    if (existing) {
      existing.items.push(item);
    } else {
      byOrderId.set(orderRow.id, { ...mapOrderRow(orderRow), items: [item] });
    }
  }

  return [...byOrderId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/**
 * Solo cambia `status` — la validación de QUÉ transición es válida
 * ("un paso adelante") la hace `hooks/useSellerOrders.ts` ANTES de llamar
 * acá (ver EJEMPLOS de la Fase 3.7); esta función confía en RLS
 * (`orders_update_seller_with_items`) + el trigger
 * `validate_order_status_transition` como la barrera real.
 */
export async function updateOrderStatus(
  orderId: string,
  status: "pagado" | "enviado" | "entregado",
  supabase: Client = createClient(),
): Promise<void> {
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) throw error;
}
