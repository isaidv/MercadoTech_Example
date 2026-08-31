/**
 * Errores tipados del servidor MCP (Fase 5.2) — las tools/resources de la
 * Fase 5.3+ lanzan uno de estos en vez de un `Error` genérico, para que
 * `safe.ts` los reconozca y los convierta en un mensaje claro para el
 * cliente en vez de un stack trace.
 */

/** El id/slug pedido no existe (producto borrado, categoría inválida, etc.). */
export class NotFoundError extends Error {
  constructor(what: string) {
    super(`No se encontró: ${what}`);
    this.name = "NotFoundError";
  }
}

/** El input no pasó la validación de zod, o es semánticamente inválido aunque tenga la forma correcta (ej. 2-4 ids esperados y llegó 1). */
export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidInputError";
  }
}

/** Voyage o Claude no respondieron (caído, rate limit, llave ausente) — mismo espíritu que los mensajes accionables de `lib/ai/`. */
export class ProviderDownError extends Error {
  constructor(provider: string, cause: string) {
    super(`${provider} no respondió: ${cause}`);
    this.name = "ProviderDownError";
  }
}

/**
 * Extrae un mensaje legible de cualquier `catch (error)` — usado por
 * `safe.ts` y `safe-resource.ts` (Fase 5.4) y por las tools que envuelven
 * errores de proveedor. Verificado en vivo (Fase 5.4, con Supabase
 * detenido): un `error instanceof Error ? error.message : String(error)`
 * a secas da `"[object Object]"` cuando el cliente de `@supabase-js`
 * rechaza con un objeto plano (`{message, code, details, hint}` —
 * `PostgrestError`, no siempre una instancia real de `Error`, sobre todo
 * en fallos de conexión). Acá se intenta, en orden: `Error.message` real,
 * después `.message` de cualquier objeto que lo tenga como string
 * (cubre `PostgrestError` y errores de `fetch`), y solo como último
 * recurso `JSON.stringify` (más útil que `String()` sobre un objeto).
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string") return message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
