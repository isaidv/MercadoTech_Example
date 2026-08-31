import type { McpServer, ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ShapeOutput, ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import { safeTool } from "../lib/safe.js";

export type ToolDefinition<Shape extends ZodRawShapeCompat> = {
  name: string;
  /** En español, para el modelo que ELIGE la tool: empieza por qué pregunta responde. */
  description: string;
  /** Forma cruda de zod (`{ campo: z.string() }`), NO `z.object({...})` — así es como lo pide el SDK. */
  inputSchema: Shape;
  handler: (input: ShapeOutput<Shape>) => Promise<CallToolResult>;
};

/**
 * Azúcar sobre el SDK (Fase 5.3) — cada archivo de `tools/` define su
 * tool con esta forma. `safeTool` (Fase 5.2, lección 7) se aplica UNA vez
 * acá adentro, no en cada archivo: así ninguna tool nueva puede
 * "olvidarse" de envolver su handler — la regla queda garantizada por la
 * estructura, no por disciplina de quien escribe el archivo siguiente.
 *
 * El `as unknown as ToolCallback<Shape>` de abajo es un cast deliberado,
 * no un escape de tipos flojo: se verificó con un archivo de prueba
 * aparte (`server.tool(...)` llamado DIRECTO, con un `Shape` concreto y
 * el mismo `Promise<CallToolResult>` de retorno) que compila limpio sin
 * ningún cast — el problema es 100% de esta función GENÉRICA: dentro de
 * `defineTool<Shape>`, TypeScript no puede probar que un callback
 * construido a partir de un `Shape` todavía ABSTRACTO satisface la
 * sobrecarga de `server.tool(...)` para ESE mismo `Shape` (limitación
 * conocida de TS al envolver una API genérica dentro de otra función
 * genérica — ni siquiera un cast directo a `ToolCallback<Shape>` alcanza,
 * hace falta pasar por `unknown`, que es lo que el propio error de tsc
 * sugiere). Cada `tools/*.ts` real llama a `defineTool` con un `Shape`
 * CONCRETO (un objeto literal de zod), así que ahí el type-check SÍ es
 * real; este cast cubre solo la implementación genérica de `defineTool`,
 * nunca oculta un error de una tool.
 */
export function defineTool<Shape extends ZodRawShapeCompat>(server: McpServer, def: ToolDefinition<Shape>): void {
  const callback = ((input: ShapeOutput<Shape>) =>
    safeTool(() => def.handler(input))) as unknown as ToolCallback<Shape>;
  server.tool(def.name, def.description, def.inputSchema, callback);
}
