import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;
export type SupportArticle = Database["public"]["Tables"]["support_articles"]["Row"];

/**
 * DERIVACIÓN — no existe `support-article.service.ts` en el proyecto web:
 * hasta esta fase, el único lector de `support_articles` era un helper
 * PRIVADO dentro de `services/embedding.service.ts` (`loadSourceContent`,
 * Fase 4.2 — no exportado, solo para indexar). Consulta directa, RLS
 * `support_articles_select_published_or_admin` ya filtra a
 * `is_published or is_admin()`, así que el cliente **anon** alcanza para
 * leer los publicados. Usada por el resource `mercadotech://faq` y por el
 * prompt `generar_articulo_faq` (como referencia de estilo).
 */
export async function listPublishedArticles(supabase: Client): Promise<SupportArticle[]> {
  const { data, error } = await supabase
    .from("support_articles")
    .select("*")
    .eq("is_published", true)
    .order("category", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
