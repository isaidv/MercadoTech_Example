import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getProductById } from "@/services/product.service";
import type { Question } from "@/types/question";
import type { Product } from "@/types/product";

type Client = SupabaseClient<Database>;

export type QuestionWithProduct = {
  question: Question;
  product: Product;
};

/**
 * DERIVACIÓN — `question.service.ts` solo expone `listByProduct` (por
 * producto) y `answer` (un UPDATE, no una lectura); no hay `getById`. Se
 * compone: una consulta directa a `questions` por id (misma tabla, misma
 * policy pública `questions_select_all` que ya usa `listByProduct`) +
 * `product.service.getProductById` para el contexto del producto que
 * necesita el prompt `redactar_respuesta_pregunta` (Fase 5.4).
 */
export async function getQuestionWithProduct(supabase: Client, questionId: string): Promise<QuestionWithProduct | null> {
  const { data: question, error } = await supabase.from("questions").select("*").eq("id", questionId).maybeSingle();
  if (error) throw error;
  if (!question) return null;

  const product = await getProductById(question.product_id, supabase);
  return { question, product };
}
