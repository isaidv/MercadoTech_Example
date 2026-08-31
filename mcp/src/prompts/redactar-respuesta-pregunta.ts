import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getQuestionWithProduct } from "../shared/questions.js";
import { definePrompt } from "./define-prompt.js";
import { buildPromptResult } from "./build-prompt-result.js";
import { createContext } from "../context.js";

const INSTRUCTIONS = `Redactá un BORRADOR de respuesta para el VENDEDOR, contestando la pregunta del comprador sobre este producto.

Reglas estrictas:
- Usá ÚNICAMENTE la información del producto embebida a continuación. Si la pregunta pide un dato que no está ahí, el borrador debe decir que hay que confirmarlo — nunca inventarlo.
- Tono cordial y directo, como si el vendedor mismo lo escribiera.
- Es un BORRADOR: el vendedor lo revisa antes de publicarlo. Este servidor MCP no publica respuestas — la tool question.service.answer (fuera de este servidor) es la única vía real.`;

/**
 * Prompt #3 — `redactar_respuesta_pregunta`. Reutiliza
 * `getQuestionWithProduct` (`shared/questions.ts`, derivación nueva de
 * esta fase — `question.service.ts` no tiene `getById`).
 */
export function registerRedactarRespuestaPreguntaPrompt(server: McpServer): void {
  definePrompt(server, {
    name: "redactar_respuesta_pregunta",
    description: "Redacta un borrador de respuesta del vendedor a una pregunta de un comprador, con el contexto real del producto.",
    argsSchema: { questionId: z.string().describe("Id (UUID) de la pregunta.") },
    handler: async (input) => {
      const { anon } = createContext();
      const result = await getQuestionWithProduct(anon, input.questionId);
      if (!result) {
        return buildPromptResult(`No se encontró la pregunta ${input.questionId}.`, "mercadotech://products", null);
      }
      return buildPromptResult(INSTRUCTIONS, `mercadotech://products/${result.product.id}`, result);
    },
  });
}
