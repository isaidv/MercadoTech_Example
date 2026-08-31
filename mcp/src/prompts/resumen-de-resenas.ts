import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listByProduct } from "@/services/review.service";
import { definePrompt } from "./define-prompt.js";
import { buildPromptResult } from "./build-prompt-result.js";
import { createContext } from "../context.js";

const INSTRUCTIONS = `Resumí estas reseñas en dos listas cortas: "Pros" y "Contras", según lo que dicen los compradores reales.

Reglas estrictas:
- Usá ÚNICAMENTE el texto de las reseñas embebidas a continuación. No inventes nada que no esté ahí.
- Si no hay contras claros, decilo ("sin quejas relevantes") en vez de inventar uno.
- 2 a 4 puntos por lista como máximo.`;

/**
 * Prompt #4 — `resumen_de_resenas`. Reutiliza `review.service.listByProduct`
 * — a diferencia de la tool #8 (`summarize_reviews`, que SÍ llama a
 * `lib/ai/completion.generateCompletion`), este prompt solo embebe las
 * reseñas crudas: un Prompt MCP nunca llama a un proveedor de IA por su
 * cuenta, es un formulario para que el modelo del cliente redacte el
 * resumen, no un motor que ya lo redacta.
 */
export function registerResumenDeResenasPrompt(server: McpServer): void {
  definePrompt(server, {
    name: "resumen_de_resenas",
    description: "Arma el material para resumir las reseñas de un producto en pros y contras, a partir de comentarios reales.",
    argsSchema: { productId: z.string().describe("Id (UUID) del producto.") },
    handler: async (input) => {
      const { anon } = createContext();
      const reviews = await listByProduct(input.productId, anon);
      return buildPromptResult(INSTRUCTIONS, `mercadotech://products/${input.productId}`, reviews);
    },
  });
}
