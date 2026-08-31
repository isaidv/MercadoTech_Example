import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ask } from "@/services/chat.service";
import { defineTool } from "./define-tool.js";
import { createContext } from "../context.js";
import { toolSuccess } from "../lib/tool-result.js";
import { ProviderDownError } from "../lib/errors.js";

/**
 * Tool #5 — `ask_assistant`. Reutiliza `chat.service.ask` (Fase 4.6) tal
 * cual — el mismo pipeline búsqueda → contexto → completion que usan
 * `/asistente` y `/soporte`. Cliente **admin**: `ask()` busca en
 * `knowledge_embeddings` por dentro (vía `searchKnowledge`), misma RLS
 * que la tool #4 — sin sesión de usuario, hace falta admin.
 *
 * Si falta `VOYAGE_API_KEY`/`ANTHROPIC_API_KEY` o el proveedor está
 * caído, `ask()` deja propagar el error accionable de `lib/ai/` — se
 * atrapa acá como `ProviderDownError`, nunca tumba el servidor.
 */
export function registerAskAssistantTool(server: McpServer): void {
  defineTool(server, {
    name: "ask_assistant",
    description:
      "Le pregunta al asistente conversacional de MercadoTech (el mismo que usan /asistente y /soporte en la web) " +
      "y devuelve una respuesta redactada CON las fuentes citadas (productos o artículos de ayuda reales). " +
      "Modo 'compras': recomendaciones de productos. Modo 'soporte': preguntas frecuentes (envíos, devoluciones, pagos).",
    inputSchema: {
      query: z.string().min(1).describe("La pregunta del usuario, en lenguaje natural."),
      mode: z.enum(["compras", "soporte"]).describe("'compras' para asesoría de productos, 'soporte' para preguntas de la FAQ."),
    },
    handler: async (input) => {
      const { admin } = createContext();
      let result;
      try {
        result = await ask(input.query, input.mode, {}, admin);
      } catch (error) {
        throw new ProviderDownError("Voyage AI / Claude", error instanceof Error ? error.message : String(error));
      }
      return toolSuccess(result.answer, {
        sources: result.sources,
        hasRelevantContext: result.hasRelevantContext,
        metadata: result.metadata,
      });
    },
  });
}
