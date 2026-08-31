import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { mapProductRow, PRODUCT_SELECT, type ProductQueryRow } from "@/services/product.service";
import {
  VECTOR_SEARCH_DEFAULT_SIMILARITY_THRESHOLD,
  VECTOR_SEARCH_DEFAULT_TOP_K,
  VECTOR_SEARCH_MAX_TOP_K,
  type KnowledgeSourceType,
} from "@/lib/constants/ai";
import type { Product } from "@/types/product";

type Client = SupabaseClient<Database>;

export type KnowledgeMatch = {
  source_type: string;
  source_id: string;
  content: string;
  metadata: unknown;
  similarity: number;
};

export type SearchByEmbeddingOptions = {
  /** `null` (o ausente) busca en ambas fuentes — mismo contrato que el RPC. */
  sourceType?: KnowledgeSourceType | null;
  topK?: number;
  similarityThreshold?: number;
};

/**
 * Llama directo al RPC `match_knowledge` (Fase 4.1) con un embedding ya
 * calculado — capa fina, sin hidratar contra ninguna tabla origen.
 * `searchProducts` (abajo) es quien la usa para el caso concreto de
 * productos.
 */
export async function searchByEmbedding(
  embedding: number[],
  options: SearchByEmbeddingOptions = {},
  supabase: Client,
): Promise<KnowledgeMatch[]> {
  const topK = Math.min(options.topK ?? VECTOR_SEARCH_DEFAULT_TOP_K, VECTOR_SEARCH_MAX_TOP_K);

  const { data, error } = await supabase.rpc("match_knowledge", {
    query_embedding: `[${embedding.join(",")}]`,
    // El tipo generado (types/database.ts) marca p_source_type como
    // `string`, no `string | null` — el RPC real sí lo acepta null (así
    // busca en ambas fuentes, ver 20260826140200_create_match_knowledge.sql):
    // es un límite conocido de `supabase gen types` con parámetros
    // nullables sin default, no una restricción real del lado de Postgres.
    p_source_type: (options.sourceType ?? null) as unknown as string,
    match_count: topK,
    similarity_threshold: options.similarityThreshold ?? VECTOR_SEARCH_DEFAULT_SIMILARITY_THRESHOLD,
  });
  if (error) throw error;

  return data ?? [];
}

/**
 * Búsqueda semántica genérica (Fase 4.6): embedding de la consulta
 * (`input_type: 'query'`) + `match_knowledge` filtrado a UNA fuente —
 * sin hidratar contra ninguna tabla origen (a diferencia de
 * `searchProducts`, abajo). Es lo que usa `chat.service.ts` para ambos
 * modos ('compras' busca `producto`, 'soporte' busca `articulo_soporte`):
 * el chat no necesita `image_url`/`price`, solo el texto y la metadata ya
 * guardados en la ficha.
 */
export async function searchKnowledge(
  query: string,
  sourceType: KnowledgeSourceType,
  options: { topK?: number; similarityThreshold?: number } = {},
  supabase: Client,
): Promise<KnowledgeMatch[]> {
  const embedding = await generateEmbedding(query, "query");
  return searchByEmbedding(embedding, { ...options, sourceType }, supabase);
}

export type SemanticProductResult = Product & { similarity: number };

/**
 * Búsqueda semántica de productos (Fase 4.4): embedding de la consulta
 * (SIEMPRE `input_type: 'query'` — asimetría de la Guía Claude + Voyage,
 * lección 2; nunca 'document', eso es solo para indexar) + `match_knowledge`
 * filtrado a `source_type='producto'` + hidratación contra `products`
 * ACTIVOS (mismas convenciones de `product.service.ts`: `price` a
 * `number`, `image_url` ya resuelta — se reutiliza `mapProductRow` en vez
 * de reimplementar el mapeo).
 *
 * Descarta huérfanos en silencio: una ficha de un producto borrado, o
 * desactivado después de fichado, simplemente no aparece en el resultado
 * — nunca rompe la búsqueda por un id que ya no es válido.
 */
export async function searchProducts(
  query: string,
  options: { topK?: number; similarityThreshold?: number } = {},
  supabase: Client,
): Promise<SemanticProductResult[]> {
  const embedding = await generateEmbedding(query, "query");
  const matches = await searchByEmbedding(embedding, { ...options, sourceType: "producto" }, supabase);
  if (matches.length === 0) return [];

  const ids = matches.map((match) => match.source_id);
  const { data, error } = await supabase.from("products").select(PRODUCT_SELECT).eq("is_active", true).in("id", ids);
  if (error) throw error;

  const productsById = new Map((data as ProductQueryRow[]).map((row) => [row.id, mapProductRow(row)]));

  // Orden de match_knowledge (similitud descendente), no el que devuelva
  // `in (...)` — Postgres no lo garantiza. `filter` con type guard descarta
  // huérfanos sin dejar `undefined` en el resultado.
  return matches
    .map((match): SemanticProductResult | null => {
      const product = productsById.get(match.source_id);
      return product ? { ...product, similarity: match.similarity } : null;
    })
    .filter((result): result is SemanticProductResult => result !== null);
}
