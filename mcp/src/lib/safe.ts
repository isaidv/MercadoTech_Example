import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { toolError } from "./tool-result.js";
import { getErrorMessage, InvalidInputError, NotFoundError, ProviderDownError } from "./errors.js";

/**
 * Wrapper try/catch uniforme (lección 7 de la Guía) — TODA tool de la
 * Fase 5.3+ envuelve su lógica acá adentro. Un handler que tira una
 * excepción sin pasar por este wrapper rompe la llamada entera del lado
 * del protocolo; atrapada acá, se devuelve como un `CallToolResult` con
 * `isError: true` — la tool "falló" de una manera que el cliente puede
 * leer y mostrar, no un servidor que se cae.
 *
 * (Los resources de la Fase 5.4 necesitan su propio wrapper equivalente
 * — misma idea, forma de retorno distinta — porque "un resource caído
 * nunca debe tumbar `resources/list` completo" es una regla sobre CADA
 * resource individual, no sobre tools. Se agrega ahí, no acá, para no
 * escribir código sin nada todavía que lo use.)
 */
export async function safeTool(fn: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof InvalidInputError || error instanceof ProviderDownError) {
      return toolError(error.message);
    }
    return toolError(`Error inesperado: ${getErrorMessage(error)}`);
  }
}
