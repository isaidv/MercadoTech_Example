import type { KnowledgeSourceType } from "@/lib/constants/ai";

/**
 * Dispara el reindexado de una fuente sin bloquear ni poder romper el
 * flujo que la llama — best-effort, fire-and-forget (Fase 4.3). NUNCA
 * lanza: cualquier fallo (endpoint caído, sin sesión, Voyage caído,
 * `VOYAGE_API_KEY` ausente) termina en un `console.warn`, nunca en un
 * toast ni en una excepción que interrumpa publicar/editar/(des)activar/
 * borrar un producto — publicar debe funcionar exactamente igual que en
 * la sesión 3 pase lo que pase acá adentro.
 *
 * Solo hace un `fetch` al propio endpoint del sitio, como cualquier otro
 * llamado del navegador a `app/api/v1/`; no conoce el cliente admin (eso
 * vive únicamente en `app/api/v1/reindex/route.ts` y
 * `scripts/index-all.ts`).
 */
export async function triggerReindex(sourceType: KnowledgeSourceType, sourceId: string): Promise<void> {
  try {
    const response = await fetch("/api/v1/reindex", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceType, sourceId }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.warn(`[indexing-trigger] reindex de ${sourceType} ${sourceId} falló (HTTP ${response.status}): ${body}`);
    }
  } catch (error) {
    console.warn(`[indexing-trigger] reindex de ${sourceType} ${sourceId} falló:`, error);
  }
}
