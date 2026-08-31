import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getProductById, getProductImages } from "@/services/product.service";
import { listByProduct as listQuestionsByProduct } from "@/services/question.service";
import { defineTool } from "./define-tool.js";
import { createContext } from "../context.js";
import { toolSuccess } from "../lib/tool-result.js";
import { NotFoundError } from "../lib/errors.js";

/**
 * Tool #2 — `get_product`. Reutiliza `product.service.{getProductById,
 * getProductImages}` + `question.service.listByProduct`. Cliente **anon**
 * (mismas policies públicas que la tool #1).
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

      let product;
      try {
        product = await getProductById(input.productId, anon);
      } catch {
        // `getProductById` usa `.single()`: 0 filas (borrado, inactivo, o
        // simplemente no existe) tira un error de Postgrest, no un `null`
        // — se traduce acá a un error tipado con mensaje claro.
        throw new NotFoundError(`producto ${input.productId}`);
      }

      const [images, questions] = await Promise.all([
        getProductImages(input.productId, anon),
        listQuestionsByProduct(input.productId, anon),
      ]);

      return toolSuccess(`${product.title} — S/ ${product.price.toFixed(2)}, ${product.stock} en stock.`, {
        product,
        images,
        questions,
      });
    },
  });
}
