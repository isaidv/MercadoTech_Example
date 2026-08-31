import { createClient } from "@/lib/supabase/client";
import { getPublicUrl, PRODUCT_IMAGES_BUCKET } from "@/services/storage.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { CartItem, CartItemWithProduct } from "@/types/order";

type Client = SupabaseClient<Database>;

export type { CartItemWithProduct };

type CartRow = CartItem & {
  products:
    | (Pick<Database["public"]["Tables"]["products"]["Row"], "id" | "title" | "price" | "stock"> & {
        product_images: Pick<Database["public"]["Tables"]["product_images"]["Row"], "image_path" | "position">[];
      })
    | null;
};

const CART_SELECT = "*, products(id, title, price, stock, product_images(image_path, position))";

function mapCartRow(row: CartRow): CartItemWithProduct {
  const product = row.products;
  if (!product) {
    return { id: row.id, user_id: row.user_id, product_id: row.product_id, quantity: row.quantity, created_at: row.created_at, product: null };
  }

  const cover = [...product.product_images].sort((a, b) => a.position - b.position)[0];

  return {
    id: row.id,
    user_id: row.user_id,
    product_id: row.product_id,
    quantity: row.quantity,
    created_at: row.created_at,
    product: {
      id: product.id,
      title: product.title,
      price: Number(product.price),
      stock: product.stock,
      image_url: cover ? getPublicUrl(PRODUCT_IMAGES_BUCKET, cover.image_path) : null,
    },
  };
}

export async function getItems(
  userId: string,
  supabase: Client = createClient(),
): Promise<CartItemWithProduct[]> {
  const { data, error } = await supabase
    .from("cart_items")
    .select(CART_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as CartRow[]).map(mapCartRow);
}

/**
 * Si el producto ya está en el carrito (`unique(user_id, product_id)`),
 * SUMA la cantidad en vez de reemplazarla, y la limita al stock actual —
 * agregar 2 y después 3 del mismo producto con stock 4 deja el carrito en
 * 4, no en 5.
 *
 * `cart_items.quantity` tiene `check (quantity > 0)` — nunca se puede
 * "clamear a 0". Por eso, si el stock YA es 0, esta función rechaza el
 * agregado en vez de forzar una cantidad de 1 que no respetaría el stock
 * real (BuyBox ya deshabilita el botón en ese caso; esto es la misma
 * regla del lado del service, por si se llama desde otro lado).
 */
export async function addItem(
  userId: string,
  productId: string,
  quantity: number,
  supabase: Client = createClient(),
): Promise<void> {
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("stock")
    .eq("id", productId)
    .single();
  if (productError) throw productError;

  if (product.stock <= 0) {
    throw new Error("Este producto no tiene stock disponible.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();
  if (existingError) throw existingError;

  const desiredQuantity = (existing?.quantity ?? 0) + quantity;
  const clampedQuantity = Math.min(desiredQuantity, product.stock);

  if (existing) {
    const { error } = await supabase.from("cart_items").update({ quantity: clampedQuantity }).eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("cart_items")
    .insert({ user_id: userId, product_id: productId, quantity: clampedQuantity });
  if (error) throw error;
}

export async function updateQuantity(
  cartItemId: string,
  quantity: number,
  supabase: Client = createClient(),
): Promise<void> {
  const { error } = await supabase.from("cart_items").update({ quantity }).eq("id", cartItemId);
  if (error) throw error;
}

export async function removeItem(cartItemId: string, supabase: Client = createClient()): Promise<void> {
  const { error } = await supabase.from("cart_items").delete().eq("id", cartItemId);
  if (error) throw error;
}

/** Vacía el carrito completo — no la usa ningún hook de esta fase (el RPC de checkout ya lo vacía solo), pero la lista el archivo "Archivos" de la Fase 3.6 como parte de la API del service. */
export async function clear(userId: string, supabase: Client = createClient()): Promise<void> {
  const { error } = await supabase.from("cart_items").delete().eq("user_id", userId);
  if (error) throw error;
}
