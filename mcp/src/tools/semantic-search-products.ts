import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { searchProducts } from "@/services/vector-search.service";
import { defineTool } from "./define-tool.js";
import { createContext } from "../context.js";
import { toolSuccess } from "../lib/tool-result.js";
import { getErrorMessage, ProviderDownError } from "../lib/errors.js";

/**
 * Tool #4 — `semantic_search_products`. Reutiliza
 * `vector-search.service.searchProducts` (Fase 4.4) tal cual — mismo
 * pipeline que la pestaña "Resultados con IA" de `/buscar`. Cliente
 * **admin**: `knowledge_embeddings_select_authenticated` (Fase 4.1) solo
 * autoriza SELECT a `authenticated`; el servidor MCP no tiene sesión de
 * usuario (ni anon-con-sesión ni logueada), así que ni siquiera
 * "authenticated" alcanza sin el cliente admin.
 *
 * Si falta `VOYAGE_API_KEY` (o el proveedor está caído), `searchProducts`
 * llama internamente a `generateEmbedding` y ESA función tira el error
 * accionable de `lib/ai/embeddings.ts` — se atrapa acá y se re-envuelve
 * como `ProviderDownError`, nunca tumba el servidor.
 */
export function registerSemanticSearchProductsTool(server: McpServer): void {
  defineTool(server, {
    name: "semantic_search_products",
    description:
      "Busca productos por SIGNIFICADO, no por palabras exactas — ej. 'algo para hacer ejercicio' encuentra " +
      "audífonos deportivos aunque el título no diga 'ejercicio'. Útil cuando search_products (texto exacto) " +
      "no encuentra nada, o cuando la consulta describe una necesidad en vez de nombrar un producto.",
    inputSchema: {
      query: z.string().min(1).describe("Descripción en lenguaje natural de lo que se busca."),
      topK: z.number().int().min(1).max(20).optional().describe("Cuántos resultados devolver como máximo (default del sistema si no se especifica)."),
    },
    handler: async (input) => {
      const { admin } = createContext();
      let results;
      try {
        results = await searchProducts(input.query, { topK: input.topK }, admin);
      } catch (error) {
        throw new ProviderDownError("Voyage AI (embeddings)", getErrorMessage(error));
      }
      return toolSuccess(`${results.length} producto(s) relevante(s) para "${input.query}".`, { results });
    },
  });
}
