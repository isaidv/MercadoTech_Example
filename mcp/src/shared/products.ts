import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getProductById, getProductImages } from "@/services/product.service";
import { listByProduct as listQuestionsByProduct } from "@/services/question.service";
import type { Product, ProductImage } from "@/types/product";
import type { Question } from "@/types/question";

type Client = SupabaseClient<Database>;

/**
 * DERIVACIÓN (Fase 5.3, lección 6 de la Guía) — `product.service.ts` NO
 * expone un `getProductsByIds`. Se verificó con
 * `grep -n "^export " services/product.service.ts` antes de escribir esta
 * fase (Prompt de "confirmar entendimiento" de la sesión): la función no
 * existe, solo `getProductById` (singular). En vez de agregarla al
 * service (services/ es del proyecto web, no de `mcp/` — regla de capas)
 * o reimplementar la query acá, esta función COMPONE la que sí existe:
 * un `getProductById` por id, en paralelo. Mismo dato final, cero SQL
 * nuevo, cero lógica de negocio nueva — solo orquestación, que es
 * exactamente lo que `mcp/src/shared/` existe para documentar.
 *
 * Los ids que fallan (borrados, inactivos y no son del dueño, o
 * inexistentes) se descartan en silencio — el caller (`compare_products`)
 * decide si lo que queda alcanza para una comparación útil.
 */
export async function getProductsByIds(ids: string[], supabase: Client): Promise<Product[]> {
  const results = await Promise.allSettled(ids.map((id) => getProductById(id, supabase)));
  return results
    .filter((result): result is PromiseFulfilledResult<Product> => result.status === "fulfilled")
    .map((result) => result.value);
}

export type ProductDetail = {
  product: Product;
  images: ProductImage[];
  questions: Question[];
};

/**
 * DERIVACIÓN — la misma composición que usaba `tools/get-product.ts`
 * (Fase 5.3, `getProductById` + `getProductImages` +
 * `question.service.listByProduct`, ningún service la da armada de una).
 * Se movió acá en la Fase 5.4 porque el resource `products/{id}` necesita
 * EXACTAMENTE la misma forma ("misma forma que la tool #2 — misma función
 * compartida", spec) — así la tool y el resource llaman a esta única
 * función en vez de duplicar la composición en dos archivos.
 *
 * Deja pasar el error de `getProductById` tal cual (0 filas → error de
 * Postgrest `.single()`) — cada caller decide cómo traducirlo: la tool
 * lo envuelve en `NotFoundError` (Fase 5.3), el resource lo deja
 * atrapar por `safeRead` (Fase 5.4, lección 7).
 */
export async function getProductDetail(productId: string, supabase: Client): Promise<ProductDetail> {
  const product = await getProductById(productId, supabase);
  const [images, questions] = await Promise.all([
    getProductImages(productId, supabase),
    listQuestionsByProduct(productId, supabase),
  ]);
  return { product, images, questions };
}
