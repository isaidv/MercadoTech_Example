import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listActiveProducts } from "@/services/product.service";
import { getCategoriesWithCounts, getTopSellingProducts } from "../shared/stats.js";
import { defineTool } from "./define-tool.js";
import { createContext } from "../context.js";
import { toolSuccess } from "../lib/tool-result.js";

const TOP_SELLING_LIMIT = 5;

/**
 * Tool #9 — `get_store_stats`. Derivación en `shared/stats.ts` (decisión
 * 6) componiendo `category.service.listCategories` +
 * `product.service.listActiveProducts`. Cliente **mixto**: categorías y
 * el total de productos activos son públicos (`anon` alcanza), pero
 * "top vendidos" lee `order_items` — RLS `order_items_select_...` solo
 * autoriza comprador/vendedor-con-ítems/admin, así que esa parte
 * necesita `admin` (mismo motivo que la tool #10). Solo agregados, cero
 * datos personales de compradores.
 */
export function registerGetStoreStatsTool(server: McpServer): void {
  defineTool(server, {
    name: "get_store_stats",
    description:
      "Estadísticas generales de la tienda: cuántos productos activos hay, cuántos por categoría, y los más " +
      "vendidos. Útil para '¿qué tan grande es el catálogo?' o '¿qué se vende más?' — nunca expone datos de compradores.",
    inputSchema: {},
    handler: async () => {
      const { anon, admin } = createContext();

      const [categories, { total: activeProductCount }, topSelling] = await Promise.all([
        getCategoriesWithCounts(anon),
        listActiveProducts({}, anon),
        getTopSellingProducts(admin, TOP_SELLING_LIMIT),
      ]);

      return toolSuccess(`${activeProductCount} productos activos en ${categories.length} categorías.`, {
        activeProductCount,
        categories,
        topSelling,
      });
    },
  });
}
