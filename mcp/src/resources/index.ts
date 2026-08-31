import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerInfoResource } from "./info.js";
import { registerProductsResource } from "./products.js";
import { registerProductDetailResource } from "./product-detail.js";
import { registerCategoriesResource } from "./categories.js";
import { registerSellersResource } from "./sellers.js";
import { registerFaqResource } from "./faq.js";
import { registerStatsResource } from "./stats.js";

/**
 * Registro central de los 7 resources (Fase 5.4). Agregar uno nuevo es
 * un archivo en `resources/` + una línea acá.
 */
export function registerResources(server: McpServer): void {
  registerInfoResource(server);
  registerProductsResource(server);
  registerProductDetailResource(server);
  registerCategoriesResource(server);
  registerSellersResource(server);
  registerFaqResource(server);
  registerStatsResource(server);
}
