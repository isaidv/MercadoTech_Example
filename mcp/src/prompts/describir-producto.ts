import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getProductDetail } from "../shared/products.js";
import { definePrompt } from "./define-prompt.js";
import { buildPromptResult } from "./build-prompt-result.js";
import { createContext } from "../context.js";

const INSTRUCTIONS = `Redactá una ficha comercial atractiva y BREVE de este producto para MercadoTech, en español.

Reglas estrictas:
- Usá ÚNICAMENTE los datos del producto embebido a continuación. No inventes especificaciones, materiales, ni stock que no estén ahí.
- Si el stock es bajo o cero, decilo — no lo ocultes.
- Tono comercial pero honesto: destacá lo real, sin exagerar.
- 3 a 5 oraciones como máximo.

Si necesitás comparar este producto con otros, o buscar productos relacionados, este servidor MCP tiene tools para eso (compare_products, find_related_products) — no reimplementes esa búsqueda acá.`;

/**
 * Prompt #1 — `describir_producto`. Reutiliza `getProductDetail`
 * (`shared/products.ts`, la misma derivación de la tool #2 y del
 * resource `products/{id}`).
 */
export function registerDescribirProductoPrompt(server: McpServer): void {
  definePrompt(server, {
    name: "describir_producto",
    description: "Genera una ficha comercial fiel de un producto, a partir de sus datos reales — sin inventar specs ni stock.",
    argsSchema: { productId: z.string().describe("Id (UUID) del producto.") },
    handler: async (input) => {
      const { anon } = createContext();
      const detail = await getProductDetail(input.productId, anon);
      return buildPromptResult(INSTRUCTIONS, `mercadotech://products/${input.productId}`, detail);
    },
  });
}
