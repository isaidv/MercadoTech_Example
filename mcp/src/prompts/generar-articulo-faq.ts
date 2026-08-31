import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listPublishedArticles } from "../shared/faq.js";
import { definePrompt } from "./define-prompt.js";
import { buildPromptResult } from "./build-prompt-result.js";
import { createContext } from "../context.js";

function buildInstructions(tema: string): string {
  return `Redactá un BORRADOR de artículo nuevo para la FAQ de soporte de MercadoTech sobre el tema: "${tema}".

Seguí el estilo (pregunta corta como título + respuesta directa) de los artículos existentes que se embeben a continuación, como referencia.

Reglas estrictas:
- Es un BORRADOR para que un admin lo revise y publique — este servidor MCP no publica nada.
- Mantené el mismo tono y longitud que los artículos existentes.
- No inventes políticas de la plataforma que no estén ya reflejadas en los artículos existentes. Si el tema requiere una decisión de negocio nueva (ej. una política que todavía no existe), decilo explícito en el borrador en vez de inventarla.`;
}

/**
 * Prompt #5 — `generar_articulo_faq`. Reutiliza `listPublishedArticles`
 * (`shared/faq.ts`, la misma derivación del resource `mercadotech://faq`)
 * — los artículos existentes viajan como referencia de estilo, no se
 * genera el artículo nuevo acá (eso lo hace el modelo del cliente).
 */
export function registerGenerarArticuloFaqPrompt(server: McpServer): void {
  definePrompt(server, {
    name: "generar_articulo_faq",
    description: "Arma el material para redactar un borrador de artículo de FAQ nuevo, con el estilo de los artículos publicados existentes.",
    argsSchema: { tema: z.string().min(1).describe("Tema del artículo nuevo, ej. 'cambios de talla en ropa'.") },
    handler: async (input) => {
      const { anon } = createContext();
      const existing = await listPublishedArticles(anon);
      return buildPromptResult(buildInstructions(input.tema), "mercadotech://faq", existing);
    },
  });
}
