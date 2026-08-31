import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerDescribirProductoPrompt } from "./describir-producto.js";
import { registerCompararProductosPrompt } from "./comparar-productos.js";
import { registerRedactarRespuestaPreguntaPrompt } from "./redactar-respuesta-pregunta.js";
import { registerResumenDeResenasPrompt } from "./resumen-de-resenas.js";
import { registerGenerarArticuloFaqPrompt } from "./generar-articulo-faq.js";

/**
 * Registro central de los 5 Prompts MCP (Fase 5.4 — nunca confundir con
 * Skills de Claude Code, lección 2). Agregar uno nuevo es un archivo en
 * `prompts/` + una línea acá.
 */
export function registerPrompts(server: McpServer): void {
  registerDescribirProductoPrompt(server);
  registerCompararProductosPrompt(server);
  registerRedactarRespuestaPreguntaPrompt(server);
  registerResumenDeResenasPrompt(server);
  registerGenerarArticuloFaqPrompt(server);
}
