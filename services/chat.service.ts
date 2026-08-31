import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { searchKnowledge } from "@/services/vector-search.service";
import { buildRagContext, type ContextBuilderSource } from "@/lib/ai/context-builder";
import { generateCompletion } from "@/lib/ai/completion";
import { SHOPPING_SYSTEM_INSTRUCTIONS, SUPPORT_SYSTEM_INSTRUCTIONS } from "@/lib/ai/prompts";
import type { KnowledgeSourceType } from "@/lib/constants/ai";
import type { ChatMode, ChatResult, ChatSource } from "@/types/chat";

type Client = SupabaseClient<Database>;

const MODE_SOURCE_TYPE: Record<ChatMode, KnowledgeSourceType> = {
  compras: "producto",
  soporte: "articulo_soporte",
};

const MODE_SYSTEM_INSTRUCTIONS: Record<ChatMode, string> = {
  compras: SHOPPING_SYSTEM_INSTRUCTIONS,
  soporte: SUPPORT_SYSTEM_INSTRUCTIONS,
};

/**
 * `knowledge_embeddings.metadata` es `Json`/`unknown` a nivel de tipo —
 * `embedding.service.ts` (Fase 4.2) guarda `{title, category, ...}` ahí,
 * pero `lib/ai/context-builder.ts` no conoce esa forma a propósito (no
 * conoce ninguna tabla). Extraer el título es trabajo de esta capa, la
 * única que sabe cómo se guardó.
 */
function extractTitle(metadata: unknown): string | undefined {
  if (metadata && typeof metadata === "object" && "title" in metadata) {
    const title = (metadata as { title: unknown }).title;
    if (typeof title === "string") return title;
  }
  return undefined;
}

export type AskOptions = {
  topK?: number;
  similarityThreshold?: number;
  maxSources?: number;
  minSimilarity?: number;
  minContentLength?: number;
  maxContextChars?: number;
  minTruncatedSourceChars?: number;
};

/**
 * Orquesta la conversación completa — búsqueda → contexto → redacción —
 * sin reimplementar ninguna de las tres: cada eslabón vive en su propia
 * capa (`vector-search.service`, `lib/ai/context-builder`,
 * `lib/ai/completion`) y esta función solo los encadena. No conoce a
 * Claude ni a Voyage, no arma el mensaje de usuario a mano y no recorta
 * contexto por su cuenta.
 *
 * Si no hay contexto relevante, `generateCompletion` se llama IGUAL con
 * el mensaje de "sin fuentes" que arma `context-builder` — las
 * instrucciones del modo ya cubren qué responder en ese caso ("no
 * encontré productos que coincidan" / sugerir un ticket). Nunca hay un
 * atajo local que reemplace esa redacción.
 */
export async function ask(query: string, mode: ChatMode, opts: AskOptions = {}, supabase: Client): Promise<ChatResult> {
  const sourceType = MODE_SOURCE_TYPE[mode];
  const systemInstructions = MODE_SYSTEM_INSTRUCTIONS[mode];

  const matches = await searchKnowledge(
    query,
    sourceType,
    { topK: opts.topK, similarityThreshold: opts.similarityThreshold },
    supabase,
  );

  const contextSources: ContextBuilderSource[] = matches.map((match) => ({
    source_type: match.source_type,
    source_id: match.source_id,
    content: match.content,
    similarity: match.similarity,
    title: extractTitle(match.metadata),
  }));

  const context = buildRagContext(query, contextSources, {
    maxSources: opts.maxSources,
    minSimilarity: opts.minSimilarity,
    minContentLength: opts.minContentLength,
    maxContextChars: opts.maxContextChars,
    minTruncatedSourceChars: opts.minTruncatedSourceChars,
  });

  const hasRelevantContext = context.sources.length > 0;

  const completion = await generateCompletion(systemInstructions, context.userMessage);

  const sources: ChatSource[] = context.sources.map((source) => ({
    index: source.index,
    source_type: source.source_type,
    source_id: source.source_id,
    title: source.title,
    similarity: source.similarity,
  }));

  return {
    query,
    answer: completion.text,
    hasRelevantContext,
    sources,
    metadata: {
      model: completion.model,
      retrievedCount: matches.length,
      usedSourceCount: context.sources.length,
      contextTruncated: context.stats.contextTruncated,
    },
  };
}
