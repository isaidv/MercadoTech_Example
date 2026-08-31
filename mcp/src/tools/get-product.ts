import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getProductDetail } from "../shared/products.js";
import { defineTool } from "./define-tool.js";
import { createContext } from "../context.js";
import { toolSuccess } from "../lib/tool-result.js";
import { NotFoundError } from "../lib/errors.js";

/**
 * Tool #2 — `get_product`. Reutiliza la derivación `getProductDetail`
 * (`shared/products.ts`: `product.service.{getProductById,
 * getProductImages}` + `question.service.listByProduct` — factorizada
 * en la Fase 5.4 para que el resource `products/{id}` use exactamente lo
 * mismo, sin duplicar la composición). Cliente **anon** (mismas policies
 * públicas que la tool #1).
 *
 * NO llama `review.service.getAverage` por separado — sería una segunda
 * consulta para un dato que `getProductById` YA calcula
 * (`average_rating`/`review_count`, vía `mapProductRow` sobre el mismo
 * join `reviews(rating)`, Fase 3.4): mismo service, mismo cómputo, sin
 * pedirlo dos veces.
 */
export function registerGetProductTool(server: McpServer): void {
  defineTool(server, {
    name: "get_product",
    description:
      "Trae el detalle completo de UN producto por id: título, descripción, marca, condición, precio, stock, " +
      "imagen, rating promedio, y sus preguntas y respuestas públicas. Usar cuando ya se sabe el id exacto " +
      "(ej. después de search_products o compare_products) y hace falta más detalle de uno solo.",
    inputSchema: {
      productId: z.string().describe("Id (UUID) del producto."),
    },
    handler: async (input) => {
      const { anon } = createContext();

      let detail;
      try {
        detail = await getProductDetail(input.productId, anon);
      } catch {
        // `getProductById` usa `.single()`: 0 filas (borrado, inactivo, o
        // simplemente no existe) tira un error de Postgrest, no un `null`
        // — se traduce acá a un error tipado con mensaje claro.
        throw new NotFoundError(`producto ${input.productId}`);
      }

      const { product } = detail;
      return toolSuccess(`${product.title} — S/ ${product.price.toFixed(2)}, ${product.stock} en stock.`, detail);
    },
  });
}
