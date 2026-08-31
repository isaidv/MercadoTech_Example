import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getProductById } from "@/services/product.service";
import { listCategories } from "@/services/category.service";
import { generateEmbedding, buildProductEmbeddingText } from "@/lib/ai/embeddings";
import { searchByEmbedding } from "@/services/vector-search.service";
import { defineTool } from "./define-tool.js";
import { createContext } from "../context.js";
import { toolSuccess } from "../lib/tool-result.js";
import { getErrorMessage, NotFoundError, ProviderDownError } from "../lib/errors.js";

/**
 * Tool #7 — `find_related_products` ("más como este"). Reutiliza
 * `lib/ai/embeddings.{generateEmbedding,buildProductEmbeddingText}` +
 * `vector-search.service.searchByEmbedding` — arma la MISMA ficha de
 * texto que usa la indexación (Fase 4.2/4.3), la embebe con
 * `input_type: "query"` (está buscando, no fichando de nuevo — lección 2
 * de la Guía Claude + Voyage) y busca contra `knowledge_embeddings`.
 * Cliente **admin**: misma RLS que las tools #4/#5.
 *
 * `product.service.getProductById` y `category.service.listCategories` se
 * reutilizan solo para reconstruir el texto a embeber (el nombre de la
 * categoría no viaja en `Product`, solo `category_id`) — cero SQL nuevo.
 */

/**
 * `KnowledgeMatch.metadata` es `unknown` a nivel de tipo (mismo motivo que
 * documenta `services/chat.service.ts:extractTitle` — nadie en `lib/ai/`
 * ni en `vector-search.service.ts` conoce la forma que le dio
 * `embedding.service.ts` al fichar). Se replica acá el mismo chequeo de
 * tipo en runtime en vez de castear a ciegas: `metadata.title` siempre es
 * string en la práctica (así lo guarda `embedding.service.ts`), pero un
 * cast sin verificar dejaría pasar cualquier otro tipo tal cual hacia un
 * campo que la tool declara como texto legible.
 */
function extractMetadataTitle(metadata: unknown): string | undefined {
  if (metadata && typeof metadata === "object" && "title" in metadata) {
    const title = (metadata as { title: unknown }).title;
    if (typeof title === "string") return title;
  }
  return undefined;
}

export function registerFindRelatedProductsTool(server: McpServer): void {
  defineTool(server, {
    name: "find_related_products",
    description:
      "Dado un producto, encuentra otros SIMILARES por significado (misma categoría, uso o características), " +
      "no por coincidencia de texto. Útil para '¿qué más me recomiendan como esto?' a partir de un id conocido.",
    inputSchema: {
      productId: z.string().describe("Id (UUID) del producto de referencia."),
      topK: z.number().int().min(1).max(10).optional().describe("Cuántos productos relacionados devolver (default 5)."),
    },
    handler: async (input) => {
      const { admin } = createContext();

      let product;
      try {
        product = await getProductById(input.productId, admin);
      } catch {
        throw new NotFoundError(`producto ${input.productId}`);
      }

      const categories = await listCategories(admin);
      const category = categories.find((c) => c.id === product.category_id);
      const text = buildProductEmbeddingText(product, { name: category?.name ?? "" });

      const topK = input.topK ?? 5;
      let matches;
      try {
        const embedding = await generateEmbedding(text, "query");
        matches = await searchByEmbedding(embedding, { sourceType: "producto", topK: topK + 1 }, admin);
      } catch (error) {
        throw new ProviderDownError("Voyage AI (embeddings)", getErrorMessage(error));
      }

      const related = matches
        .filter((match) => match.source_id !== input.productId)
        .slice(0, topK)
        .map((match) => ({
          productId: match.source_id,
          title: extractMetadataTitle(match.metadata) ?? match.content.split("\n")[0],
          similarity: match.similarity,
        }));

      return toolSuccess(`${related.length} producto(s) relacionado(s) con "${product.title}".`, { related });
    },
  });
}
