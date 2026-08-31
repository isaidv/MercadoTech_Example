import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_CHAT_MAX_TOKENS, ANTHROPIC_CHAT_MODEL_DEFAULT } from "@/lib/constants/ai";

export type CompletionResult = {
  text: string;
  model: string;
  stopReason: string | null;
};

/**
 * Único archivo del proyecto que conoce la API de Claude. SDK oficial
 * `@anthropic-ai/sdk` (Guía Claude + Voyage, lección 1) — trae los tipos
 * y las clases de error tipadas de la lección 8; este archivo no conoce a
 * Voyage, es el proveedor simétrico de `embeddings.ts`.
 *
 * NUNCA manda `output_config.effort` ni `thinking`: son de los modelos
 * 4.6+, Haiku 4.5 responde 400 si se los manda (lección 4) — un RAG no
 * los necesita, el trabajo de razonamiento ya lo hizo el retrieval.
 */
export async function generateCompletion(system: string, user: string): Promise<CompletionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Falta ANTHROPIC_API_KEY en .env.local — sin ella, Claude (chat) no puede redactar respuestas. Ver 'Antes de empezar' en MercadoTech_sesion4.md.",
    );
  }

  const model = process.env.ANTHROPIC_CHAT_MODEL || ANTHROPIC_CHAT_MODEL_DEFAULT;
  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model,
      max_tokens: ANTHROPIC_CHAT_MAX_TOKENS,
      system,
      messages: [{ role: "user", content: user }],
    });

    // La respuesta es content: ContentBlock[] — hay que filtrar por
    // type === "text" antes de leer .text, nunca asumir content[0]
    // (puede traer bloques de otro tipo primero).
    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude (chat) respondió sin ningún bloque de texto.");
    }

    return { text: textBlock.text, model: message.model, stopReason: message.stop_reason };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new Error("Claude (chat) rechazó la llave (401): revisá ANTHROPIC_API_KEY en .env.local.");
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new Error(
        "Claude (chat) devolvió límite de tasa (429): esperá y reintentá, o revisá el saldo en console.anthropic.com.",
      );
    }
    if (error instanceof Anthropic.BadRequestError) {
      throw new Error(
        `Claude (chat) rechazó la solicitud (400): revisá que el modelo ("${model}") sea válido y que la llamada no mande output_config.effort ni thinking (Haiku 4.5 no los acepta).`,
      );
    }
    if (error instanceof Anthropic.APIError) {
      throw new Error(`Claude (chat) falló: ${error.message}`);
    }
    throw error;
  }
}
