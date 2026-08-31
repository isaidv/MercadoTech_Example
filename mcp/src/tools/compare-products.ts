import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getProductsByIds } from "../shared/products.js";
import { defineTool } from "./define-tool.js";
import { createContext } from "../context.js";
import { toolSuccess } from "../lib/tool-result.js";
import { InvalidInputError } from "../lib/errors.js";

/**
 * Tool #6 — `compare_products`. Reutiliza `getProductById` a través de la
 * derivación `getProductsByIds` de `shared/products.ts` (`product.service`
 * no expone un batch — ver el comentario ahí). Cliente **anon**: mismas
 * policies públicas que las tools #1/#2.
 */
export function registerCompareProductsTool(server: McpServer): void {
  defineTool(server, {
    name: "compare_products",
    description:
      "Compara entre 2 y 4 productos lado a lado: precio, condición, marca, stock y rating de cada uno. " +
      "Usar cuando el usuario pide elegir entre opciones concretas que ya tiene identificadas (ej. dos laptops por id).",
    inputSchema: {
      productIds: z.array(z.string()).min(2).max(4).describe("Entre 2 y 4 ids (UUID) de productos a comparar."),
    },
    handler: async (input) => {
      const { anon } = createContext();
      const products = await getProductsByIds(input.productIds, anon);

      const missing = input.productIds.length - products.length;
      if (products.length < 2) {
        throw new InvalidInputError(
          `Solo ${products.length} de los ${input.productIds.length} ids son productos válidos — hacen falta al menos 2 para comparar.`,
        );
      }

      const summary =
        missing > 0
          ? `Comparando ${products.length} productos (${missing} id(s) no se encontraron o no están activos).`
          : `Comparando ${products.length} productos.`;

      return toolSuccess(summary, { products, requestedCount: input.productIds.length, foundCount: products.length });
    },
  });
}
