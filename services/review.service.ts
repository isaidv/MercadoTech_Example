import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Review } from "@/types/review";

type Client = SupabaseClient<Database>;

export async function listByProduct(productId: string, supabase: Client = createClient()): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export type ReviewAverage = { average: number | null; count: number };

export async function getAverage(
  productId: string,
  supabase: Client = createClient(),
): Promise<ReviewAverage> {
  const { data, error } = await supabase.from("reviews").select("rating").eq("product_id", productId);
  if (error) throw error;

  if (data.length === 0) return { average: null, count: 0 };
  const total = data.reduce((sum, row) => sum + row.rating, 0);
  return { average: total / data.length, count: data.length };
}

export type CanReviewResult = { allowed: boolean; orderId: string | null };

/**
 * `{allowed, orderId}` — refleja exactamente lo que
 * `reviews_insert_verified_purchase` va a exigir en el INSERT: un pedido
 * `entregado` del propio comprador que contenga el producto, Y que no
 * exista ya una reseña suya (unique `(product_id, buyer_id)`). Es defensa
 * en profundidad — la RLS igual lo garantiza aunque el hook se equivoque —
 * pero evita mostrar un formulario que el INSERT rechazaría.
 */
export async function canReview(
  productId: string,
  userId: string,
  supabase: Client = createClient(),
): Promise<CanReviewResult> {
  const { data: existing, error: existingError } = await supabase
    .from("reviews")
    .select("id")
    .eq("product_id", productId)
    .eq("buyer_id", userId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return { allowed: false, orderId: null };

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, order_items!inner(product_id)")
    .eq("buyer_id", userId)
    .eq("status", "entregado")
    .eq("order_items.product_id", productId)
    .limit(1);
  if (ordersError) throw ordersError;

  const order = orders?.[0];
  return order ? { allowed: true, orderId: order.id } : { allowed: false, orderId: null };
}

export type CreateReviewInput = {
  productId: string;
  orderId: string;
  buyerId: string;
  rating: number;
  comment?: string | null;
};

/**
 * `orderId` viaja SIEMPRE (nunca se infiere en el servidor): es lo que
 * `reviews_insert_verified_purchase` cruza contra `orders.status = 'entregado'`
 * y `order_items.product_id`. `hooks/useReviews.ts` solo llama esto cuando
 * `canReview.allowed` es true, así que `orderId` siempre viene de un
 * `canReview` previo, nunca inventado en el cliente.
 */
export async function create(
  input: CreateReviewInput,
  supabase: Client = createClient(),
): Promise<Review> {
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      product_id: input.productId,
      buyer_id: input.buyerId,
      order_id: input.orderId,
      rating: input.rating,
      comment: input.comment ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
