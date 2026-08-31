import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools/index.js";
import { registerResources } from "./resources/index.js";
import { registerPrompts } from "./prompts/index.js";

const SERVER_NAME = "mercadotech";
const SERVER_VERSION = "0.1.0";

/**
 * Crea la instancia del servidor MCP y registra sus capabilities.
 * `McpServer` calcula `capabilities` a partir de lo que se registre con
 * `registerTool`/`registerResource`/`registerPrompt` — no hace falta
 * declararlas a mano.
 *
 * Fase 5.3: las 10 tools de `tools/index.ts`. Fase 5.4: los 7 resources
 * (`resources/index.ts`) y los 5 Prompts MCP (`prompts/index.ts`) — este
 * archivo no crece con cada tool/resource/prompt nueva, solo los conecta.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}
