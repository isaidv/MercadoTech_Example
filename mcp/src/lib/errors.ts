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
