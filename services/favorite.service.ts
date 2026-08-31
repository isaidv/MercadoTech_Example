import { createClient } from "@/lib/supabase/client";
import { mapProductRow, PRODUCT_SELECT, type ProductQueryRow } from "@/services/product.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Product } from "@/types/product";

type Client = SupabaseClient<Database>;

export async function isFavorite(
  productId: string,
  userId: string,
  supabase: Client = createClient(),
): Promise<boolean> {
  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .eq("product_id", productId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

/**
 * `favorites` no tiene UPDATE (es un toggle insert/delete, ver el
 * comentario de la migración de RLS) — por eso esta función primero
 * consulta el estado actual y decide INSERT o DELETE, en vez de un
 * `upsert`. Devuelve el nuevo estado.
 */
export async function toggle(
  productId: string,
  userId: string,
  supabase: Client = createClient(),
): Promise<boolean> {
  const already = await isFavorite(productId, userId, supabase);

  if (already) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("product_id", productId)
      .eq("user_id", userId);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase.from("favorites").insert({ product_id: productId, user_id: userId });
  if (error) throw error;
  return true;
}

/**
 * Productos favoritos con el mismo shape que `listActiveProducts`
 * (`mapProductRow`/`PRODUCT_SELECT` importados de `product.service.ts`, no
 * duplicados) para que `/favoritos` reutilice `ProductCard` tal cual.
 * Un producto favorito que el vendedor desactivó después llega con
 * `products: null` (RLS de `products_select_active_or_own` lo oculta) — se
 * filtra en vez de romper la página.
 */
export async function listMine(userId: string, supabase: Client = createClient()): Promise<Product[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select(`product_id, created_at, products(${PRODUCT_SELECT})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? [])
    .map((row) => row.products as unknown as ProductQueryRow | null)
    .filter((product): product is ProductQueryRow => product !== null)
    .map(mapProductRow);
}
