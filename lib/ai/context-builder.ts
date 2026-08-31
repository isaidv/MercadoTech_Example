import {
  CONTEXT_BUILDER_DEFAULT_MAX_CONTEXT_CHARS,
  CONTEXT_BUILDER_DEFAULT_MAX_SOURCES,
  CONTEXT_BUILDER_DEFAULT_MIN_SIMILARITY,
  CONTEXT_BUILDER_MIN_CONTENT_LENGTH,
  CONTEXT_BUILDER_MIN_TRUNCATED_SOURCE_CHARS,
} from "@/lib/constants/ai";
import { buildRagUserMessage } from "@/lib/ai/prompts";

/**
 * Fuente cruda recuperada por `match_knowledge` (Fase 4.1) — forma
 * mínima que necesita esta función, no el tipo enriquecido de
 * `services/vector-search.service.ts` (`SemanticProductResult`/
 * `KnowledgeMatch`, que trae `metadata: unknown`). Este archivo no
 * importa `services/` a propósito: es responsabilidad de quien llame
 * (`chat.service.ts`, Fase 4.6) extraer un `title` legible de esa
 * `metadata` antes de pasarlo acá — mantiene `lib/ai/` sin conocer la
 * forma de ninguna tabla.
 */
export type ContextBuilderSource = {
  source_type: string;
  source_id: string;
  content: string;
  similarity: number;
  title?: string;
};

export type ContextBuilderResultSource = {
  /** 1-indexado — el mismo número que el `[n]` que cita `buildRagUserMessage` y que la UI convierte en enlace (Fase 4.7). */
  index: number;
  source_type: string;
  source_id: string;
  title?: string;
  similarity: number;
  /** El contenido REALMENTE usado — puede venir recortado por el presupuesto de caracteres. */
  content: string;
};

export type ContextBuilderResult = {
  userMessage: string;
  sources: ContextBuilderResultSource[];
  stats: {
    /** true si el presupuesto de caracteres dejó afuera, o recortó, alguna fuente que la selección sí había elegido. */
    contextTruncated: boolean;
    /** Suma de caracteres de `sources[].content` (el contenido ya recortado, no el original). */
    totalChars: number;
  };
};

export type BuildRagContextOptions = {
  maxSources?: number;
  minSimilarity?: number;
  minContentLength?: number;
  maxContextChars?: number;
  minTruncatedSourceChars?: number;
};

/**
 * El "criterio del bibliotecario" (Fase 4.5): de todas las fichas
 * recuperadas, cuáles entran de verdad al escritorio del redactor y en
 * qué orden, sin pasarse del espacio disponible. Función PURA — cero
 * red, cero Supabase, cero React — por eso es 100% testeable en
 * aislamiento (sesión 6) con datos en memoria.
 *
 * (1) Selección: filtra por `minSimilarity` y `minContentLength`, ordena
 *     por similitud descendente (`Array.sort` es estable desde ES2019:
 *     un empate de similitud conserva el orden de entrada, sin
 *     desempate manual) y corta a `maxSources`.
 * (2) Presupuesto: acumula contenido hasta `maxContextChars`. Si a la
 *     última fuente que cabría le quedan menos de
 *     `minTruncatedSourceChars` caracteres de presupuesto, se descarta
 *     ENTERA en vez de recortarla — media frase confunde más de lo que
 *     aporta.
 */
export function buildRagContext(
  query: string,
  results: ContextBuilderSource[],
  options: BuildRagContextOptions = {},
): ContextBuilderResult {
  const maxSources = options.maxSources ?? CONTEXT_BUILDER_DEFAULT_MAX_SOURCES;
  const minSimilarity = options.minSimilarity ?? CONTEXT_BUILDER_DEFAULT_MIN_SIMILARITY;
  const minContentLength = options.minContentLength ?? CONTEXT_BUILDER_MIN_CONTENT_LENGTH;
  const maxContextChars = options.maxContextChars ?? CONTEXT_BUILDER_DEFAULT_MAX_CONTEXT_CHARS;
  const minTruncatedSourceChars = options.minTruncatedSourceChars ?? CONTEXT_BUILDER_MIN_TRUNCATED_SOURCE_CHARS;

  // (1) Selección.
  const selected = results
    .filter((result) => result.similarity >= minSimilarity && result.content.length >= minContentLength)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxSources);

  // (2) Presupuesto.
  const sources: ContextBuilderResultSource[] = [];
  let remainingChars = maxContextChars;
  let contextTruncated = false;

  for (const candidate of selected) {
    if (remainingChars <= 0) {
      contextTruncated = true;
      break;
    }

    if (candidate.content.length <= remainingChars) {
      sources.push({
        index: sources.length + 1,
        source_type: candidate.source_type,
        source_id: candidate.source_id,
        title: candidate.title,
        similarity: candidate.similarity,
        content: candidate.content,
      });
      remainingChars -= candidate.content.length;
      continue;
    }

    // No entra completa. ¿Vale la pena recortarla?
    if (remainingChars < minTruncatedSourceChars) {
      // Ni recortada aporta — se descarta ENTERA. Sin presupuesto útil
      // para nada más de todos modos, así que se corta acá.
      contextTruncated = true;
      break;
    }

    sources.push({
      index: sources.length + 1,
      source_type: candidate.source_type,
      source_id: candidate.source_id,
      title: candidate.title,
      similarity: candidate.similarity,
      content: candidate.content.slice(0, remainingChars),
    });
    contextTruncated = true;
    break; // remainingChars queda en 0: no hay espacio para ninguna fuente más.
  }

  // Si la selección tenía más candidatos de los que terminaron entrando
  // por presupuesto, eso también cuenta como "contexto truncado" —
  // aunque la última fuente que sí entró haya entrado completa.
  if (sources.length < selected.length) {
    contextTruncated = true;
  }

  const totalChars = sources.reduce((sum, source) => sum + source.content.length, 0);

  const userMessage = buildRagUserMessage(
    query,
    sources.map((source) => ({ index: source.index, content: source.content })),
  );

  return {
    userMessage,
    sources,
    stats: { contextTruncated, totalChars },
  };
}
