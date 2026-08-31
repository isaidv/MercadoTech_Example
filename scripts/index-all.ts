/**
 * scripts/index-all.ts — Fase 4.3.
 *
 * Ficha TODOS los productos activos y artículos publicados de una sola
 * vez. Corre fuera del navegador (`npx tsx scripts/index-all.ts`), con el
 * cliente admin — junto con `app/api/v1/reindex/route.ts`, es el único
 * lugar del proyecto donde aparece `lib/supabase/admin.ts`.
 *
 * Cuándo correrlo:
 * - Una vez, para poblar `knowledge_embeddings` desde cero (ej. después
 *   de `supabase db reset`, que la deja vacía).
 * - Cuando el admin edita un `support_article` directo por SQL (Studio o
 *   psql): a diferencia de un producto (que ya dispara `triggerReindex`
 *   desde la UI del vendedor al publicar/editar), un artículo editado por
 *   SQL no pasa por ningún hook — este script es la única vía para
 *   refichar la FAQ tras un cambio así.
 */
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { indexSource } from "@/services/embedding.service";
import type { KnowledgeSourceType } from "@/lib/constants/ai";

// A diferencia del servidor de Next.js (que carga .env.local solo), un
// script standalone corrido con `tsx` no — sin esto, `createAdminClient()`
// no encuentra NEXT_PUBLIC_SUPABASE_URL ni SUPABASE_SERVICE_ROLE_KEY.
process.loadEnvFile(path.resolve(import.meta.dirname, "../.env.local"));

/**
 * Reintento con backoff SOLO acá, no en `lib/ai/embeddings.ts`: una
 * cuenta de Voyage sin método de pago queda limitada a 3 RPM (no es un
 * error de la app, lo dice el mensaje del proveedor tal cual), y este
 * script indexa 24 fuentes seguidas — para el reindex interactivo
 * (`app/api/v1/reindex`, disparado fire-and-forget desde la UI) bloquear
 * 20s reintentando sería peor que dejarlo fallar silencioso, así que ese
 * camino NO reintenta.
 */
async function indexWithRetry(sourceType: KnowledgeSourceType, sourceId: string, supabase: ReturnType<typeof createAdminClient>) {
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await indexSource(sourceType, sourceId, supabase);
      return;
    } catch (error) {
      const isRateLimit = error instanceof Error && error.message.includes("límite de tasa");
      if (!isRateLimit || attempt === maxAttempts) throw error;
      const waitMs = 21_000;
      console.warn(`  límite de tasa de Voyage, reintento ${attempt}/${maxAttempts - 1} en ${waitMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

async function main() {
  const supabase = createAdminClient();

  const { data: products, error: productsError } = await supabase.from("products").select("id").eq("is_active", true);
  if (productsError) throw productsError;

  const { data: articles, error: articlesError } = await supabase
    .from("support_articles")
    .select("id")
    .eq("is_published", true);
  if (articlesError) throw articlesError;

  let productCount = 0;
  for (const product of products ?? []) {
    await indexWithRetry("producto", product.id, supabase);
    productCount += 1;
    console.log(`  producto ${productCount}/${products?.length ?? 0} fichado`);
  }

  let articleCount = 0;
  for (const article of articles ?? []) {
    await indexWithRetry("articulo_soporte", article.id, supabase);
    articleCount += 1;
    console.log(`  artículo ${articleCount}/${articles?.length ?? 0} fichado`);
  }

  console.log(`Productos indexados: ${productCount}`);
  console.log(`Artículos indexados: ${articleCount}`);
  console.log(`Total: ${productCount + articleCount}`);
}

main().catch((error) => {
  console.error("index-all falló:", error instanceof Error ? error.message : error);
  process.exit(1);
});
