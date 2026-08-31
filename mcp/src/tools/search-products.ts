import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listActiveProducts } from "@/services/product.service";
import { PRODUCT_CONDITIONS } from "@/lib/constants/roles";
import { defineTool } from "./define-tool.js";
import { createContext } from "../context.js";
import { toolSuccess } from "../lib/tool-result.js";

/**
 * Tool #1 — `search_products`. Reutiliza `product.service.listActiveProducts`
 * tal cual (Fase 3.4), mismos filtros que usa `/buscar` y el catálogo web.
 * Cliente **anon**: `products_select_active_or_own` permite SELECT público
 * sobre productos activos, sin necesitar sesión.
 */
export function registerSearchProductsTool(server: McpServer): void {
  defineTool(server, {
    name: "search_products",
    description:
      "Busca productos ACTIVOS del catálogo por texto exacto y filtros (marca/título, precio, condición, categoría). " +
      "Para buscar por significado en vez de palabras exactas (ej. \"algo liviano para viajar\"), usá semantic_search_products. " +
      "Devuelve título, marca, precio, condición, stock e imagen de cada resultado, con el total de coincidencias.",
    inputSchema: {
      search: z.string().optional().describe("Texto a buscar en el título o la marca (coincidencia parcial, no exacta)."),
      categorySlug: z.string().optional().describe("Slug de una categoría para filtrar (ver list_categories para los slugs válidos)."),
      condition: z
        .array(z.enum(PRODUCT_CONDITIONS))
        .optional()
        .describe("Filtrar por condición: nuevo, usado o reacondicionado. Se puede pedir más de una."),
      minPrice: z.number().optional().describe("Precio mínimo en soles peruanos (S/)."),
      maxPrice: z.number().optional().describe("Precio máximo en soles peruanos (S/)."),
      sort: z
        .enum(["recientes", "precio_asc", "precio_desc"])
        .optional()
        .describe("Orden de los resultados: más recientes primero (default), precio de menor a mayor, o de mayor a menor."),
      page: z.number().int().min(1).optional().describe("Página de resultados, 1-indexada (12 productos por página)."),
    },
    handler: async (input) => {
      const { anon } = createContext();
      const { items, total } = await listActiveProducts(
        {
          search: input.search,
          categorySlug: input.categorySlug,
          condition: input.condition,
          minPrice: input.minPrice,
          maxPrice: input.maxPrice,
          sort: input.sort,
          page: input.page,
        },
        anon,
      );
      const summary = `${total} producto(s) encontrado(s)${input.search ? ` para "${input.search}"` : ""}.`;
      return toolSuccess(summary, { total, items });
    },
  });
}
