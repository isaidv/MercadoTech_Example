import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getStoreStats } from "../shared/stats.js";
import { defineStaticResource } from "./define-resource.js";
import { createContext } from "../context.js";

/**
 * Resource #7 — `mercadotech://stats`. Reutiliza la misma derivación que
 * la tool #9 (`get_store_stats`, `shared/stats.ts`). Cliente **mixto**:
 * `anon` para categorías/total de productos, `admin` para top vendidos
 * (RLS de `order_items`) — mismo motivo que la tool #9.
 */
export function registerStatsResource(server: McpServer): void {
  defineStaticResource(server, {
    name: "stats",
    uri: "mercadotech://stats",
    title: "Estadísticas de la tienda",
    description: "Productos activos por categoría y los más vendidos. Solo agregados, cero datos personales.",
    read: async () => {
      const { anon, admin } = createContext();
      const stats = await getStoreStats(anon, admin);
      return {
        contents: [{ uri: "mercadotech://stats", mimeType: "application/json", text: JSON.stringify(stats, null, 2) }],
      };
    },
  });
}
