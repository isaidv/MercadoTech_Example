import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getProductById } from "@/services/product.service";
import type { Product } from "@/types/product";

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
