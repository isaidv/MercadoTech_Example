import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type { KnowledgeSourceType } from "@/lib/constants/ai";
import { buildProductEmbeddingText, buildSupportArticleEmbeddingText, generateEmbedding } from "@/lib/ai/embeddings";

type Client = SupabaseClient<Database>;

/**
 * Orquesta: carga la fuente (producto+categoría o artículo) → arma el
 * texto → genera el embedding (Voyage, SIEMPRE `input_type: 'document'` —
 * esto ficha para el índice, nunca busca) → upsert en
 * `knowledge_embeddings`.
 *
 * El cliente que recibe SIEMPRE debe ser el admin (service role): esta
 * tabla no tiene policy de INSERT/UPDATE para nadie más (Fase 4.1). Este
 * archivo NO importa `lib/supabase/admin.ts` — se lo inyecta el caller
 * (Route Handler de `app/api/v1/reindex` o `scripts/index-all.ts`, Fase
 * 4.3), para que ese cliente nunca aparezca fuera de esos dos lugares.
 */
export async function indexSource(sourceType: KnowledgeSourceType, sourceId: string, supabase: Client): Promise<void> {
  const { content, metadata } = await loadSourceContent(sourceType, sourceId, supabase);
  const embedding = await generateEmbedding(content, "document");

  const { error } = await supabase.from("knowledge_embeddings").upsert(
    {
      source_type: sourceType,
      source_id: sourceId,
      chunk_index: 0,
      content,
      // El tipo generado (`types/database.ts`) tipa `embedding` como
      // `string`: PostgREST recibe el vector como su representación de
      // texto (`[n1,n2,...]`), no como un array JS — mismo caso que
      // `numeric` llegando como string desde el otro lado (convención de
      // MercadoTech_sesion3.md), acá en la dirección de escritura.
      embedding: `[${embedding.join(",")}]`,
      metadata,
    },
    { onConflict: "source_type,source_id,chunk_index" },
  );
  if (error) throw error;
}

async function loadSourceContent(
  sourceType: KnowledgeSourceType,
  sourceId: string,
  supabase: Client,
): Promise<{ content: string; metadata: Json }> {
  if (sourceType === "producto") {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("title, brand, condition, description, category_id")
      .eq("id", sourceId)
      .single();
    if (productError) throw productError;

    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("name")
      .eq("id", product.category_id)
      .single();
    if (categoryError) throw categoryError;

    return {
      content: buildProductEmbeddingText(product, category),
      metadata: { title: product.title, category: category.name, condition: product.condition },
    };
  }

  const { data: article, error: articleError } = await supabase
    .from("support_articles")
    .select("title, content, category")
    .eq("id", sourceId)
    .single();
  if (articleError) throw articleError;

  return {
    content: buildSupportArticleEmbeddingText(article),
    metadata: { title: article.title, category: article.category },
  };
}
