import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getCategoriesWithCounts } from "../shared/stats.js";
import { defineTool } from "./define-tool.js";
import { createContext } from "../context.js";
import { toolSuccess } from "../lib/tool-result.js";

/**
 * Tool #3 — `list_categories`. Reutiliza `category.service.listCategories`
 * + el conteo por categoría derivado en `shared/stats.ts` (decisión 6:
 * no existe un service que devuelva categorías con conteo). Cliente
 * **anon** — `categories_select_all` es público, incluido `anon`.
 */
export function registerListCategoriesTool(server: McpServer): void {
  defineTool(server, {
    name: "list_categories",
    description:
      "Lista las categorías del catálogo (ej. Laptops, Audio, Gaming) con cuántos productos activos tiene cada una. " +
      "Útil para saber qué slug pasarle a search_products, o para responder '¿qué categorías tienen?'.",
    inputSchema: {},
    handler: async () => {
      const { anon } = createContext();
      const categories = await getCategoriesWithCounts(anon);
      return toolSuccess(`${categories.length} categorías.`, { categories });
    },
  });
}
