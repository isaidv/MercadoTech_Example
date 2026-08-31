import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listByProduct } from "@/services/review.service";
import { summarizeReviews } from "../shared/summarize.js";
import { defineTool } from "./define-tool.js";
import { createContext } from "../context.js";
import { toolSuccess } from "../lib/tool-result.js";
import { ProviderDownError } from "../lib/errors.js";

/**
 * Tool #8 — `summarize_reviews`. Reutiliza `review.service.listByProduct`
 * + `lib/ai/completion.generateCompletion` (vía la derivación
 * `shared/summarize.ts` — ver ese archivo para el porqué). Cliente
 * **anon**: `reviews_select_all` es público, no hace falta admin para
 * leer reseñas.
 */
export function registerSummarizeReviewsTool(server: McpServer): void {
  defineTool(server, {
    name: "summarize_reviews",
    description:
      "Resume las reseñas de un producto en pros y contras, redactado a partir de comentarios reales de compradores. " +
      "Útil para '¿qué dicen los que lo compraron?' sin tener que leer cada reseña una por una.",
    inputSchema: {
      productId: z.string().describe("Id (UUID) del producto."),
    },
    handler: async (input) => {
      const { anon } = createContext();
      const reviews = await listByProduct(input.productId, anon);

      if (reviews.length === 0) {
        return toolSuccess("Este producto todavía no tiene reseñas.", { reviewCount: 0 });
      }

      try {
        const result = await summarizeReviews(reviews);
        return toolSuccess(result.summary, { reviewCount: result.reviewCount, averageRating: result.averageRating });
      } catch (error) {
        throw new ProviderDownError("Claude (completion)", error instanceof Error ? error.message : String(error));
      }
    },
  });
}
