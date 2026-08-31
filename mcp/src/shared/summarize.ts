import { generateCompletion } from "@/lib/ai/completion";
import type { Review } from "@/types/review";

/**
 * DERIVACIÓN (Fase 5.3, lección 6) — "resumir reseñas en pros/contras" no
 * existe como service ni como caso de uso de `lib/ai/prompts.ts` (esas
 * instrucciones son específicas del RAG de compras/soporte, sesión 4).
 * Compone lo que sí existe: `review.service.listByProduct` (la llama la
 * tool, no este archivo) + `lib/ai/completion.generateCompletion` — el
 * MISMO proveedor y la MISMA función que usa el chat, sin reimplementar
 * la llamada a Claude. Lo único nuevo acá es el texto de instrucción de
 * sistema, acotado a esta única tarea.
 */
const SUMMARIZE_REVIEWS_SYSTEM = `Resumís reseñas de productos de MercadoTech, un marketplace de tecnología.

Reglas estrictas:
- Usá ÚNICAMENTE el texto de las reseñas que te paso a continuación. No inventes ni asumas nada que no esté ahí.
- Estructura la respuesta en dos listas cortas: "Pros" y "Contras", según lo que digan los compradores reales.
- Si las reseñas no mencionan contras claros, decilo ("sin quejas relevantes") en vez de inventar uno.
- Sé breve: 2-4 puntos por lista como máximo.`;

function buildReviewsUserMessage(reviews: Review[]): string {
  const body = reviews
    .map((review, index) => `[${index + 1}] (${review.rating}/5) ${review.comment ?? "(sin comentario)"}`)
    .join("\n");
  return `Reseñas:\n${body}`;
}

export type ReviewSummary = {
  reviewCount: number;
  averageRating: number;
  summary: string;
};

/**
 * Si no hay reseñas, ni siquiera llama a Claude — no hay nada que
 * resumir, y forzar una llamada al proveedor por un array vacío sería
 * gastar una consulta real para que el modelo "invente" que no hay nada
 * que decir. El caller (`summarize_reviews`) ya maneja ese caso antes de
 * llegar acá; esta función asume `reviews.length > 0`.
 */
export async function summarizeReviews(reviews: Review[]): Promise<ReviewSummary> {
  const completion = await generateCompletion(SUMMARIZE_REVIEWS_SYSTEM, buildReviewsUserMessage(reviews));
  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  return { reviewCount: reviews.length, averageRating, summary: completion.text };
}
