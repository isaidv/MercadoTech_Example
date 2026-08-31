import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Forma común de los 5 Prompts MCP (Fase 5.4, patrón de ReadHub): un
 * mensaje de INSTRUCCIÓN en texto + el contenido real embebido como
 * `EmbeddedResource` (`type: "resource"`, con su propia URI y
 * `mimeType`) — no interpolado a mano dentro del texto. El prompt NUNCA
 * llama a un proveedor de IA por su cuenta (ni Voyage ni Claude): es un
 * formulario para que el modelo del CLIENTE lo procese, no un motor.
 */
export function buildPromptResult(instructions: string, resourceUri: string, data: unknown): GetPromptResult {
  return {
    messages: [
      { role: "user", content: { type: "text", text: instructions } },
      {
        role: "user",
        content: {
          type: "resource",
          resource: { uri: resourceUri, mimeType: "application/json", text: JSON.stringify(data, null, 2) },
        },
      },
    ],
  };
}
