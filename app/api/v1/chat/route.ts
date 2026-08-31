import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ask } from "@/services/chat.service";
import { apiError } from "@/lib/api-response";
import { CHAT_QUERY_MAX_CHARS } from "@/lib/constants/ai";
import type { ChatMode } from "@/types/chat";

const VALID_MODES: readonly ChatMode[] = ["compras", "soporte"];

function isChatMode(value: unknown): value is ChatMode {
  return typeof value === "string" && (VALID_MODES as readonly string[]).includes(value);
}

/**
 * POST {query, mode} — la tubería completa de conversación (Fase 4.6),
 * todavía sin interfaz: se puede conversar con MercadoTech desde `curl`.
 * Requiere sesión (decisión 1); usa el cliente de SESIÓN, no admin —
 * `match_knowledge` y `products` deben respetar la RLS del usuario que
 * pregunta, igual que `/api/v1/search/semantic`.
 *
 * `mode` inválido es 422 (semánticamente distinto de un body mal
 * formado o vacío, que es 400) — distinción explícita de la spec.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return apiError(401, "unauthorized", "Necesitás una sesión iniciada para usar el asistente.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "invalid_json", "El body debe ser JSON válido.");
  }

  const { query, mode } = (body ?? {}) as { query?: unknown; mode?: unknown };

  if (typeof query !== "string" || query.trim() === "") {
    return apiError(400, "invalid_query", "query es obligatorio y no puede estar vacío.");
  }
  if (query.length > CHAT_QUERY_MAX_CHARS) {
    return apiError(400, "query_too_long", `query no puede superar ${CHAT_QUERY_MAX_CHARS} caracteres.`);
  }
  if (!isChatMode(mode)) {
    return apiError(422, "invalid_mode", `mode debe ser uno de: ${VALID_MODES.join(", ")}.`);
  }

  try {
    const result = await ask(query.trim(), mode, {}, supabase);

    // Insumo de la Fase 4.8 (calibración de thresholds): un log
    // estructurado por consulta, no un console.log libre.
    console.log(
      JSON.stringify({
        endpoint: "chat",
        mode,
        retrievedCount: result.metadata.retrievedCount,
        usedSourceCount: result.metadata.usedSourceCount,
        hasRelevantContext: result.hasRelevantContext,
        model: result.metadata.model,
      }),
    );

    return NextResponse.json(result);
  } catch (error) {
    return apiError(502, "chat_failed", error instanceof Error ? error.message : "No se pudo procesar la consulta.");
  }
}
