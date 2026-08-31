import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getProductsByIds } from "../shared/products.js";
import { definePrompt } from "./define-prompt.js";
import { buildPromptResult } from "./build-prompt-result.js";
import { createContext } from "../context.js";

const INSTRUCTIONS = `Armá una tabla comparativa de estos productos (precio, condición, marca, stock y rating) y cerrá con una recomendación breve según distintos perfiles de uso (ej. "para uso ocasional: X, para uso intensivo: Y").

Reglas estrictas:
- Usá ÚNICAMENTE los datos embebidos a continuación. No inventes especificaciones que no estén ahí.
- Si un producto no tiene reseñas (rating null), decilo así — no inventes un promedio.`;

/**
 * Prompt #2 — `comparar_productos`. Reutiliza `getProductsByIds`
 * (`shared/products.ts`, la misma derivación de la tool #6).
 *
 * `ids` es un STRING de ids separados por coma, NO un array — el
 * protocolo MCP de Prompts solo admite argumentos de tipo texto
 * (`GetPromptRequestParams.arguments: {[key: string]: string}`, spec del
 * SDK). Se descubrió probando este prompt con el Inspector: un
 * `z.array(z.string())` como `argsSchema` nunca puede recibir un valor
 * real de ningún cliente MCP — a diferencia de las tools (`tools/call`
 * sí admite JSON arbitrario), los Prompts quedan limitados a texto por
 * el protocolo mismo, no por elección de este servidor.
 */
export function registerCompararProductosPrompt(server: McpServer): void {
  definePrompt(server, {
    name: "comparar_productos",
    description: "Arma una tabla comparativa entre 2 y 4 productos, con recomendación por perfil de uso.",
    argsSchema: {
      ids: z.string().describe('Entre 2 y 4 ids (UUID) de productos a comparar, separados por coma (ej. "id1,id2").'),
    },
    handler: async (input) => {
      const ids = input.ids
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
      if (ids.length < 2 || ids.length > 4) {
        throw new Error(`Se esperaban entre 2 y 4 ids separados por coma, llegaron ${ids.length}.`);
      }
      const { anon } = createContext();
      const products = await getProductsByIds(ids, anon);
      return buildPromptResult(INSTRUCTIONS, "mercadotech://products", products);
    },
  });
}
