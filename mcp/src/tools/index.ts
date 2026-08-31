import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSearchProductsTool } from "./search-products.js";
import { registerGetProductTool } from "./get-product.js";
import { registerListCategoriesTool } from "./list-categories.js";
import { registerSemanticSearchProductsTool } from "./semantic-search-products.js";
import { registerAskAssistantTool } from "./ask-assistant.js";
import { registerCompareProductsTool } from "./compare-products.js";
import { registerFindRelatedProductsTool } from "./find-related-products.js";
import { registerSummarizeReviewsTool } from "./summarize-reviews.js";
import { registerGetStoreStatsTool } from "./get-store-stats.js";
import { registerGetOrderStatusTool } from "./get-order-status.js";

/**
 * Registro central de las 10 tools (Fase 5.3). Agregar una tool nueva es
 * un archivo en `tools/` + una línea acá — nada más se toca.
 */
export function registerTools(server: McpServer): void {
  registerSearchProductsTool(server);
  registerGetProductTool(server);
  registerListCategoriesTool(server);
  registerSemanticSearchProductsTool(server);
  registerAskAssistantTool(server);
  registerCompareProductsTool(server);
  registerFindRelatedProductsTool(server);
  registerSummarizeReviewsTool(server);
  registerGetStoreStatsTool(server);
  registerGetOrderStatusTool(server);
}
