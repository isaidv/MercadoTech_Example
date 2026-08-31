import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Question } from "@/types/question";

type Client = SupabaseClient<Database>;

export async function listByProduct(
  productId: string,
  supabase: Client = createClient(),
): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * `questions_insert_own` exige `auth.uid() = user_id` y `answer`/`answered_at`
 * en null — nunca se puede crear una pregunta pre-respondida.
 */
export async function create(
  productId: string,
  userId: string,
  question: string,
  supabase: Client = createClient(),
): Promise<Question> {
  const { data, error } = await supabase
    .from("questions")
    .insert({ product_id: productId, user_id: userId, question })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/**
 * Responde una pregunta — SOLO actualiza `answer`/`answered_at`. No hay
 * trigger en la base de datos que blinde esto (a diferencia de
 * `orders`/`support_tickets`): el comentario de
 * `questions_update_answer_by_product_owner`
 * (20260821110000_create_rls_policies.sql) dice explícitamente que tocar
 * solo esas dos columnas es "disciplina de la capa services/" — por eso
 * esta función nunca acepta ni reenvía `question`/`user_id`/`product_id`
 * en el payload del UPDATE, aunque la policy en sí no lo fuerce.
 */
export async function answer(
  questionId: string,
  answerText: string,
  supabase: Client = createClient(),
): Promise<Question> {
  const { data, error } = await supabase
    .from("questions")
    .update({ answer: answerText, answered_at: new Date().toISOString() })
    .eq("id", questionId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
