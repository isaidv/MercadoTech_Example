import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listActiveProducts } from "@/services/product.service";
import { defineStaticResource } from "./define-resource.js";
import { createContext } from "../context.js";

/**
 * Resource #2 — `mercadotech://products`. Reutiliza
 * `product.service.listActiveProducts` (Fase 3.4, misma que la tool #1)
 * sin filtros — un resumen liviano. Cliente **anon**
 * (`products_select_active_or_own` es público).
 */
export function registerProductsResource(server: McpServer): void {
  defineStaticResource(server, {
    name: "products",
    uri: "mercadotech://products",
    title: "Catálogo de productos",
    description:
      "Resumen de productos activos: id, título, precio y categoría. Para el detalle completo de uno, leer mercadotech://products/{id}.",
    read: async () => {
      const { anon } = createContext();
      const { items, total } = await listActiveProducts({}, anon);
      const summary = items.map((product) => ({
        id: product.id,
        title: product.title,
        price: product.price,
        categoryId: product.category_id,
      }));
      return {
        contents: [
          {
            uri: "mercadotech://products",
            mimeType: "application/json",
            text: JSON.stringify({ total, items: summary }, null, 2),
          },
        ],
      };
    },
  });
}
