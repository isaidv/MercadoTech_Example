import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Formateo consistente de resultados de tool (Fase 5.2, consumido por las
 * tools reales de la Fase 5.3+) — texto legible para el modelo que
 * consume el servidor, más `structuredContent` opcional en JSON para un
 * cliente MCP que prefiera parsear el dato en vez del texto.
 */
export function toolSuccess(text: string, structured?: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: "text", text }],
    ...(structured ? { structuredContent: structured } : {}),
  };
}

/**
 * Resultado de ERROR de una tool — `isError: true`, nunca un `throw`
 * crudo hacia el protocolo. Así el cliente MCP (y el modelo del otro
 * lado) ve el error como parte de la respuesta de la tool, en vez de una
 * falla de transporte/protocolo que no puede auto-corregir. Ver
 * `safe.ts`, que es quien lo usa al atrapar excepciones.
 */
export function toolError(message: string): CallToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}
