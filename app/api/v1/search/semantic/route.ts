import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchProducts } from "@/services/vector-search.service";
import { apiError } from "@/lib/api-response";
import { CHAT_QUERY_MAX_CHARS } from "@/lib/constants/ai";

/**
 * POST {query} — búsqueda semántica de productos (Fase 4.4). Requiere
 * sesión (decisión 1 de MercadoTech_sesion4.md: la IA exige sesión — cada
 * consulta cuesta dinero real). Usa el cliente de SESIÓN, no el admin: el
 * RPC `match_knowledge` y la lectura de `products` deben respetar RLS del
 * usuario que pregunta, no bypasearla — a diferencia de
 * `/api/v1/reindex`, que sí necesita el admin porque ESCRIBE en una tabla
 * sin policy para nadie más.
 *
 * El embedding de la consulta se genera acá adentro (`searchProducts` →
 * `lib/ai/embeddings.ts`) — `VOYAGE_API_KEY` nunca sale de este archivo,
 * el navegador solo ve la respuesta ya hidratada.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return apiError(401, "unauthorized", "Necesitás una sesión iniciada para usar la búsqueda inteligente.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "invalid_json", "El body debe ser JSON válido.");
  }

  const { query } = (body ?? {}) as { query?: unknown };
  if (typeof query !== "string" || query.trim() === "") {
    return apiError(400, "invalid_query", "query es obligatorio y no puede estar vacío.");
  }
  if (query.length > CHAT_QUERY_MAX_CHARS) {
    return apiError(400, "query_too_long", `query no puede superar ${CHAT_QUERY_MAX_CHARS} caracteres.`);
  }

  try {
    const results = await searchProducts(query.trim(), {}, supabase);
    return NextResponse.json({ results });
  } catch (error) {
    return apiError(502, "search_failed", error instanceof Error ? error.message : "No se pudo completar la búsqueda.");
  }
}
