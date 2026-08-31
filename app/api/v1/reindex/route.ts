import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { indexSource } from "@/services/embedding.service";
import { apiError } from "@/lib/api-response";
import { KNOWLEDGE_SOURCE_TYPES, type KnowledgeSourceType } from "@/lib/constants/ai";

function isKnowledgeSourceType(value: unknown): value is KnowledgeSourceType {
  return typeof value === "string" && (KNOWLEDGE_SOURCE_TYPES as readonly string[]).includes(value);
}

/**
 * POST {sourceType, sourceId} — reindexa la ficha de un producto o
 * artículo en `knowledge_embeddings`, o la borra si la fuente ya no
 * existe (decisión 6 de la Fase 4.1: `source_id` no tiene FK dura).
 *
 * PRIMER Route Handler del proyecto (`app/api/v1/` estaba vacío desde la
 * sesión 2, reservado para esto exactamente): existe porque el cliente
 * admin (service role) nunca puede viajar al navegador. Único disparador
 * real es `services/indexing-trigger.service.ts` — fire-and-forget desde
 * `hooks/useProductForm.ts` y `hooks/useSellerProducts.ts` tras
 * publicar/editar/(des)activar/borrar un producto. No valida ownership
 * del recurso más allá de exigir sesión: reindexar no expone ni modifica
 * ningún dato del producto en sí, solo refresca una ficha de búsqueda
 * derivada — forzar el reindex de un producto ajeno es, como mucho, un
 * refetch innecesario, no un problema de seguridad.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return apiError(401, "unauthorized", "Necesitás una sesión iniciada para reindexar.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "invalid_json", "El body debe ser JSON válido.");
  }

  const { sourceType, sourceId } = (body ?? {}) as { sourceType?: unknown; sourceId?: unknown };
  if (!isKnowledgeSourceType(sourceType)) {
    return apiError(400, "invalid_source_type", `sourceType debe ser uno de: ${KNOWLEDGE_SOURCE_TYPES.join(", ")}.`);
  }
  if (typeof sourceId !== "string" || sourceId.trim() === "") {
    return apiError(400, "invalid_source_id", "sourceId es obligatorio y debe ser un string.");
  }

  // Cliente admin recién a partir de acá — ya se validó sesión con el de
  // arriba. Único lugar del proyecto (junto con scripts/index-all.ts)
  // donde aparece lib/supabase/admin.ts.
  const admin = createAdminClient();

  const table = sourceType === "producto" ? "products" : "support_articles";
  const { data: source, error: sourceError } = await admin.from(table).select("id").eq("id", sourceId).maybeSingle();
  if (sourceError) {
    return apiError(500, "source_lookup_failed", sourceError.message);
  }

  if (!source) {
    const { error: deleteError } = await admin
      .from("knowledge_embeddings")
      .delete()
      .eq("source_type", sourceType)
      .eq("source_id", sourceId);
    if (deleteError) {
      return apiError(500, "cleanup_failed", deleteError.message);
    }
    return NextResponse.json({ deleted: true });
  }

  try {
    await indexSource(sourceType, sourceId, admin);
  } catch (error) {
    return apiError(502, "indexing_failed", error instanceof Error ? error.message : "No se pudo generar la ficha.");
  }

  return NextResponse.json({ indexed: true });
}
