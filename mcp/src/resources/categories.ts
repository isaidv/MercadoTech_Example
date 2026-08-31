import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getCategoriesWithCounts } from "../shared/stats.js";
import { defineStaticResource } from "./define-resource.js";
import { createContext } from "../context.js";

/**
 * Resource #4 — `mercadotech://categories`. Reutiliza la misma
 * derivación que la tool #3 (`list_categories`, `shared/stats.ts`).
 * Cliente **anon** (`categories_select_all` es público).
 */
export function registerCategoriesResource(server: McpServer): void {
  defineStaticResource(server, {
    name: "categories",
    uri: "mercadotech://categories",
    title: "Categorías",
    description: "Categorías del catálogo con conteo de productos activos.",
    read: async () => {
      const { anon } = createContext();
      const categories = await getCategoriesWithCounts(anon);
      return {
        contents: [{ uri: "mercadotech://categories", mimeType: "application/json", text: JSON.stringify(categories, null, 2) }],
      };
    },
  });
}
