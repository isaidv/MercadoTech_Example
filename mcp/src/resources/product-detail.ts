import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listActiveProducts } from "@/services/product.service";
import { PRODUCTS_PAGE_SIZE } from "@/lib/constants/catalog";
import { getProductDetail } from "../shared/products.js";
import { defineResourceTemplate } from "./define-resource.js";
import { createContext } from "../context.js";

/** Tope de páginas que recorre el callback `list` — acotado a propósito, no una paginación infinita (el catálogo de este laboratorio es chico; 5×12 = hasta 60 instancias listadas). */
const MAX_LIST_PAGES = 5;

/**
 * Resource #3 — `mercadotech://products/{id}` (template). Misma forma
 * que la tool #2 (`get_product`, Fase 5.3): reutiliza la derivación
 * `getProductDetail` de `shared/products.ts`, no la reimplementa. Cliente
 * **anon**.
 */
export function registerProductDetailResource(server: McpServer): void {
  defineResourceTemplate(server, {
    name: "product-detail",
    uriTemplate: "mercadotech://products/{id}",
    title: "Detalle de un producto",
    description:
      "Detalle completo de UN producto activo por id: datos, imágenes y preguntas — misma forma que la tool get_product.",
    list: async () => {
      const { anon } = createContext();
      const resources: { uri: string; name: string; mimeType: string }[] = [];
      for (let page = 1; page <= MAX_LIST_PAGES; page += 1) {
        const { items } = await listActiveProducts({ page }, anon);
        if (items.length === 0) break;
        for (const product of items) {
          resources.push({ uri: `mercadotech://products/${product.id}`, name: product.title, mimeType: "application/json" });
        }
        if (items.length < PRODUCTS_PAGE_SIZE) break;
      }
      return { resources };
    },
    read: async (variables) => {
      const { anon } = createContext();
      const productId = String(variables.id);
      const detail = await getProductDetail(productId, anon);
      return {
        contents: [
          { uri: `mercadotech://products/${productId}`, mimeType: "application/json", text: JSON.stringify(detail, null, 2) },
        ],
      };
    },
  });
}
