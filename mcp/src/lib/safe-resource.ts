import type { ReadResourceResult, ListResourcesResult } from "@modelcontextprotocol/sdk/types.js";
import { getErrorMessage } from "./errors.js";

/**
 * Wrappers try/catch para resources (Fase 5.4, lección 7) — análogos a
 * `safeTool` (Fase 5.2), pero resources tienen DOS formas de retorno
 * distintas a proteger: leer una URI puntual (`ReadResourceResult`) y
 * enumerar instancias de un template (`ListResourcesResult`).
 *
 * "Un resource caído nunca debe tumbar `resources/list` completo" tiene
 * dos partes: (1) `safeList` — si un template no puede enumerar sus
 * instancias (ej. Supabase caído), devuelve una lista VACÍA en vez de
 * tirar, así el resto de resources/templates sigue apareciendo en el
 * listado general; (2) `safeRead` — si LEER una URI puntual falla, el
 * error vuelve como CONTENIDO de texto legible (mismo espíritu que
 * `toolError` de las tools), nunca como una excepción sin capturar que
 * tumbe esa llamada entera.
 */
export async function safeRead(uri: string, fn: () => Promise<ReadResourceResult>): Promise<ReadResourceResult> {
  try {
    return await fn();
  } catch (error) {
    return {
      contents: [{ uri, mimeType: "text/plain", text: `Error al leer este resource: ${getErrorMessage(error)}` }],
    };
  }
}

export async function safeList(fn: () => Promise<ListResourcesResult>): Promise<ListResourcesResult> {
  try {
    return await fn();
  } catch {
    return { resources: [] };
  }
}
