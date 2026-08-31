import type { McpServer, PromptCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import type { ShapeOutput, ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";

export type PromptDefinition<Shape extends ZodRawShapeCompat> = {
  name: string;
  /** En español: qué formulario es y para qué sirve. */
  description: string;
  /** Forma cruda de zod, igual que `inputSchema` en `defineTool` — NO `z.object({...})`. */
  argsSchema: Shape;
  handler: (input: ShapeOutput<Shape>) => Promise<GetPromptResult>;
};

/**
 * Azúcar sobre `server.registerPrompt` (Fase 5.4) — mismo espíritu que
 * `tools/define-tool.ts`, sin el wrapper try/catch: un Prompt MCP (lección
 * 2 — nunca confundir con una Skill de Claude Code) es un formulario, no
 * una acción con efectos; si `argsSchema` no valida o el id no existe, es
 * correcto que el error de protocolo se propague tal cual, no hace falta
 * disfrazarlo como hace `safeTool` con las tools.
 *
 * El `as unknown as PromptCallback<Shape>` es la MISMA limitación de TS
 * que ya obligó a un cast en `tools/define-tool.ts`: dentro de una
 * función genérica, el compilador no puede probar que un callback armado
 * a partir de un `Shape` todavía ABSTRACTO satisface la sobrecarga del
 * SDK para ESE `Shape` — ni siquiera con un solo genérico (a diferencia
 * de `registerTool`, que además tiene el genérico extra de
 * `outputSchema`). Cada `prompts/*.ts` real llama a `definePrompt` con un
 * `Shape` CONCRETO, así que ahí el type-check SÍ es real.
 */
export function definePrompt<Shape extends ZodRawShapeCompat>(server: McpServer, def: PromptDefinition<Shape>): void {
  const callback = def.handler as unknown as PromptCallback<Shape>;
  server.registerPrompt(def.name, { description: def.description, argsSchema: def.argsSchema }, callback);
}
