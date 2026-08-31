import { createClient } from "@/lib/supabase/client";
import { getPublicUrl, PRODUCT_IMAGES_BUCKET } from "@/services/storage.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Product, ProductImage } from "@/types/product";
import type { ProductCondition } from "@/lib/constants/roles";
import { PRODUCTS_PAGE_SIZE, type SortOption } from "@/lib/constants/catalog";

type Client = SupabaseClient<Database>;

export type ProductFilters = {
  /** Fijado desde el segmento de ruta en /categoria/[slug] — nunca desde la UI de filtros. */
  categorySlug?: string;
  /** ilike sobre title/brand — provisional hasta la búsqueda semántica de la sesión 4. */
  search?: string;
  condition?: ProductCondition[];
  minPrice?: number;
  maxPrice?: number;
  sort?: SortOption;
  /** 1-indexed. */
  page?: number;
};

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type ProductQueryRow = ProductRow & {
  product_images: Pick<Database["public"]["Tables"]["product_images"]["Row"], "image_path" | "position">[];
  reviews: Pick<Database["public"]["Tables"]["reviews"]["Row"], "rating">[];
};

// Exportado: favorite.service.ts.listMine lo reutiliza para pedir el mismo
// shape de producto anidado dentro de su join a favorites.
export const PRODUCT_SELECT = "*, product_images(image_path, position), reviews(rating)";

/**
 * Fila cruda de Supabase -> `Product` de dominio. Ordena `product_images`
 * por `position` (llega sin ordenar), resuelve `image_url` de la portada
 * (menor `position`; `null` si el producto no tiene imágenes — el seed no
 * carga ninguna en Storage, así que esto es el caso normal, no un error) y
 * calcula `average_rating`/`review_count` desde `reviews(rating)`.
 *
 * `price: Number(row.price)` — ver la TRAMPA documentada en types/product.ts:
 * PostgREST serializa `numeric(12,2)` como string aunque el tipo generado
 * diga `number`.
 *
 * Exportada: favorite.service.ts.listMine mapea con esta misma función el
 * producto anidado que le llega vía su join a favorites — mismo shape,
 * mismos cálculos, un solo lugar que los mantiene.
 */
export function mapProductRow(row: ProductQueryRow): Product {
  const cover = [...row.product_images].sort((a, b) => a.position - b.position)[0];
  const ratings = row.reviews.map((review) => review.rating);
  const reviewCount = ratings.length;
  const averageRating =
    reviewCount > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / reviewCount : null;

  return {
    id: row.id,
    seller_id: row.seller_id,
    category_id: row.category_id,
    title: row.title,
    description: row.description,
    brand: row.brand,
    condition: row.condition as ProductCondition,
    price: Number(row.price),
    stock: row.stock,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    image_url: cover ? getPublicUrl(PRODUCT_IMAGES_BUCKET, cover.image_path) : null,
    average_rating: averageRating,
    review_count: reviewCount,
  };
}

/**
 * Productos activos con filtros/orden/paginación para el catálogo (home,
 * categoría, búsqueda — las tres pantallas de la Fase 3.4 comparten esta
 * función a través de `hooks/useProducts.ts`).
 *
 * `is_active = true` se filtra EXPLÍCITO acá, no solo vía RLS
 * (`products_select_active_or_own`): esa policy deja ver al dueño sus
 * propios productos inactivos, así que un vendedor logueado navegando su
 * propia tienda vería sus inactivos mezclados con el resto si no se
 * filtrara también en la query.
 */
export async function listActiveProducts(
  filters: ProductFilters,
  supabase: Client = createClient(),
): Promise<{ items: Product[]; total: number }> {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const from = (page - 1) * PRODUCTS_PAGE_SIZE;
  const to = from + PRODUCTS_PAGE_SIZE - 1;

  let query = supabase.from("products").select(PRODUCT_SELECT, { count: "exact" }).eq("is_active", true);

  if (filters.categorySlug) {
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", filters.categorySlug)
      .single();
    if (categoryError) throw categoryError;
    query = query.eq("category_id", category.id);
  }

  if (filters.search) {
    // Provisional: ilike sobre title/brand hasta la búsqueda semántica de
    // la sesión 4. No escapa comas/paréntesis del término — aceptable acá
    // porque es un mecanismo de paso, no el definitivo.
    const term = `%${filters.search}%`;
    query = query.or(`title.ilike.${term},brand.ilike.${term}`);
  }

  if (filters.condition && filters.condition.length > 0) {
    query = query.in("condition", filters.condition);
  }
  if (filters.minPrice !== undefined) {
    query = query.gte("price", filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    query = query.lte("price", filters.maxPrice);
  }

  if (filters.sort === "precio_asc") {
    query = query.order("price", { ascending: true });
  } else if (filters.sort === "precio_desc") {
    query = query.order("price", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  return { items: (data as ProductQueryRow[]).map(mapProductRow), total: count ?? 0 };
}

export async function getProductById(id: string, supabase: Client = createClient()): Promise<Product> {
  const { data, error } = await supabase.from("products").select(PRODUCT_SELECT).eq("id", id).single();
  if (error) throw error;
  return mapProductRow(data as ProductQueryRow);
}

export async function getProductImages(
  productId: string,
  supabase: Client = createClient(),
): Promise<ProductImage[]> {
  const { data, error } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("position");
  if (error) throw error;
  return data;
}

/**
 * Registra una vista de producto (Fase 3.5, decisión 14). `product_views.user_id`
 * es `not null` y la policy `product_views_insert_own` exige
 * `(select auth.uid()) = user_id` — no hay vistas anónimas por diseño, así
 * que esta función SIEMPRE necesita un `userId` real; `hooks/useProduct.ts`
 * es quien decide no llamarla si no hay sesión.
 */
export async function registerView(
  productId: string,
  userId: string,
  supabase: Client = createClient(),
): Promise<void> {
  const { error } = await supabase.from("product_views").insert({ product_id: productId, user_id: userId });
  if (error) throw error;
}
