import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getStoreStats } from "../shared/stats.js";
import { defineTool } from "./define-tool.js";
import { createContext } from "../context.js";
import { toolSuccess } from "../lib/tool-result.js";

/**
 * Tool #9 — `get_store_stats`. Reutiliza la derivación `getStoreStats`
 * (`shared/stats.ts`, decisión 6) — factorizada en la Fase 5.4 para que
 * el resource `mercadotech://stats` componga exactamente lo mismo sin
 * repetir el `Promise.all`. Cliente **mixto**: categorías y el total de
 * productos activos son públicos (`anon` alcanza), pero "top vendidos"
 * lee `order_items` — RLS `order_items_select_...` solo autoriza
 * comprador/vendedor-con-ítems/admin, así que esa parte necesita `admin`
 * (mismo motivo que la tool #10). Solo agregados, cero datos personales
 * de compradores.
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
      const stats = await getStoreStats(anon, admin);
      return toolSuccess(`${stats.activeProductCount} productos activos en ${stats.categories.length} categorías.`, stats);
    },
  });
}
