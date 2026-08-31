import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const SERVER_NAME = "mercadotech";
const SERVER_VERSION = "0.1.0";

/**
 * Crea la instancia del servidor MCP (Fase 5.2) — metadata y nada más:
 * todavía sin tools, sin resources, sin prompts. `McpServer` calcula sus
 * propias `capabilities` a partir de lo que se registre con
 * `registerTool`/`registerResource`/`registerPrompt`, así que un servidor
 * sin registros anuncia capabilities vacías por construcción, sin que haga
 * falta declararlas a mano acá.
 *
 * Las Fases 5.3 y 5.4 registran sobre la instancia que devuelve esta
 * función (o la extienden desde `mcp/src/tools/index.ts` /
 * `mcp/src/resources/index.ts`) — este archivo no crece con cada tool
 * nueva, solo arma el servidor.
 */
export function createServer(): McpServer {
  return new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });
}
