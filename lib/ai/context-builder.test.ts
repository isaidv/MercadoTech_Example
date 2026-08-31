import { describe, expect, it } from "vitest";
import { buildRagContext, type ContextBuilderSource } from "./context-builder";
import {
  CONTEXT_BUILDER_DEFAULT_MAX_SOURCES,
  CONTEXT_BUILDER_DEFAULT_MIN_SIMILARITY,
  CONTEXT_BUILDER_MIN_CONTENT_LENGTH,
  CONTEXT_BUILDER_DEFAULT_MAX_CONTEXT_CHARS,
  CONTEXT_BUILDER_MIN_TRUNCATED_SOURCE_CHARS,
} from "@/lib/constants/ai";

/**
 * Fase 6.2 — cero mocks (context-builder.ts es 100% puro: cero red, cero
 * Supabase, cero React). Meta dura: 100% de ramas. Todos los valores
 * frontera salen de lib/constants/ai.ts (importados arriba).
 *
 * La mayoría de los tests pasa `options` explícitas en vez de apoyarse en
 * los defaults de producción — deja cada caso chico y legible sin depender
 * de construir 5+ fuentes falsas para ejercitar `maxSources`/presupuesto.
 */

function source(overrides: Partial<ContextBuilderSource> = {}): ContextBuilderSource {
  return {
    source_type: "producto",
    source_id: "p1",
    content: "contenido de prueba suficientemente largo para pasar el mínimo",
    similarity: 0.9,
    ...overrides,
  };
}

describe("buildRagContext — selección (similitud y longitud mínima)", () => {
  it("descarta una fuente con similitud por debajo del mínimo", () => {
    const result = buildRagContext("q", [source({ similarity: CONTEXT_BUILDER_DEFAULT_MIN_SIMILARITY - 0.01 })]);
    expect(result.sources).toHaveLength(0);
  });

  it("incluye una fuente con similitud EXACTAMENTE en el mínimo (frontera >=)", () => {
    const result = buildRagContext("q", [source({ similarity: CONTEXT_BUILDER_DEFAULT_MIN_SIMILARITY })]);
    expect(result.sources).toHaveLength(1);
  });

  it("descarta una fuente con contenido más corto que el mínimo, aunque la similitud sea alta", () => {
    const result = buildRagContext("q", [
      source({ content: "a".repeat(CONTEXT_BUILDER_MIN_CONTENT_LENGTH - 1) }),
    ]);
    expect(result.sources).toHaveLength(0);
  });

  it("incluye una fuente con contenido de EXACTAMENTE la longitud mínima (frontera >=)", () => {
    const result = buildRagContext("q", [source({ content: "a".repeat(CONTEXT_BUILDER_MIN_CONTENT_LENGTH) })]);
    expect(result.sources).toHaveLength(1);
  });

  it("lista vacía de resultados no rompe nada", () => {
    const result = buildRagContext("q", []);
    expect(result.sources).toEqual([]);
    expect(result.stats).toEqual({ contextTruncated: false, totalChars: 0 });
  });

  it("todo por debajo del umbral produce una lista vacía SIN marcar contextTruncated", () => {
    // Es un filtro de relevancia, no un recorte de presupuesto — semánticamente distinto.
    const result = buildRagContext("q", [source({ similarity: 0.01 }), source({ similarity: 0.02 })]);
    expect(result.sources).toEqual([]);
    expect(result.stats.contextTruncated).toBe(false);
  });
});

describe("buildRagContext — orden y maxSources", () => {
  it("ordena por similitud descendente", () => {
    const result = buildRagContext("q", [
      source({ source_id: "baja", similarity: 0.5 }),
      source({ source_id: "alta", similarity: 0.9 }),
      source({ source_id: "media", similarity: 0.7 }),
    ]);
    expect(result.sources.map((s) => s.source_id)).toEqual(["alta", "media", "baja"]);
  });

  it("un empate de similitud conserva el orden de entrada (sort estable)", () => {
    const result = buildRagContext("q", [
      source({ source_id: "primero", similarity: 0.8 }),
      source({ source_id: "segundo", similarity: 0.8 }),
    ]);
    expect(result.sources.map((s) => s.source_id)).toEqual(["primero", "segundo"]);
  });

  it("corta a maxSources aunque haya más candidatos relevantes", () => {
    const result = buildRagContext(
      "q",
      [source({ source_id: "a" }), source({ source_id: "b" }), source({ source_id: "c" })],
      { maxSources: 2 },
    );
    expect(result.sources).toHaveLength(2);
  });

  it("respeta CONTEXT_BUILDER_DEFAULT_MAX_SOURCES cuando no se pasa maxSources explícito", () => {
    const many = Array.from({ length: CONTEXT_BUILDER_DEFAULT_MAX_SOURCES + 3 }, (_, i) =>
      source({ source_id: `s${i}`, similarity: 0.9 - i * 0.01 }),
    );
    const result = buildRagContext("q", many);
    expect(result.sources).toHaveLength(CONTEXT_BUILDER_DEFAULT_MAX_SOURCES);
  });
});

describe("buildRagContext — presupuesto de caracteres", () => {
  it("una fuente que entra completa no se recorta y no marca contextTruncated", () => {
    const result = buildRagContext("q", [source({ content: "a".repeat(50) })], { maxContextChars: 100 });
    expect(result.sources[0].content).toHaveLength(50);
    expect(result.stats.contextTruncated).toBe(false);
    expect(result.stats.totalChars).toBe(50);
  });

  it("descarta ENTERA la última fuente si el resto del presupuesto es menor al mínimo truncado (caso de la spec)", () => {
    const result = buildRagContext(
      "q",
      [source({ source_id: "cabe", content: "a".repeat(50) }), source({ source_id: "no-cabe", content: "b".repeat(500) })],
      { maxContextChars: 50 + CONTEXT_BUILDER_MIN_TRUNCATED_SOURCE_CHARS - 1 },
    );
    expect(result.sources.map((s) => s.source_id)).toEqual(["cabe"]);
    expect(result.stats.contextTruncated).toBe(true);
  });

  it("frontera: con EXACTAMENTE minTruncatedSourceChars de resto, SÍ recorta en vez de descartar", () => {
    const result = buildRagContext(
      "q",
      [source({ source_id: "cabe", content: "a".repeat(50) }), source({ source_id: "recortada", content: "b".repeat(500) })],
      { maxContextChars: 50 + CONTEXT_BUILDER_MIN_TRUNCATED_SOURCE_CHARS },
    );
    expect(result.sources.map((s) => s.source_id)).toEqual(["cabe", "recortada"]);
    expect(result.sources[1].content).toHaveLength(CONTEXT_BUILDER_MIN_TRUNCATED_SOURCE_CHARS);
    expect(result.stats.contextTruncated).toBe(true);
  });

  it("remainingChars llega a 0 exacto antes de la última fuente: se descarta por completo (rama remainingChars <= 0)", () => {
    const result = buildRagContext(
      "q",
      [source({ source_id: "consume-todo", content: "a".repeat(100) }), source({ source_id: "sin-espacio", content: "b".repeat(100) })],
      { maxContextChars: 100 },
    );
    expect(result.sources.map((s) => s.source_id)).toEqual(["consume-todo"]);
    expect(result.stats.contextTruncated).toBe(true);
  });

  it("respeta CONTEXT_BUILDER_DEFAULT_MAX_CONTEXT_CHARS cuando no se pasa maxContextChars explícito", () => {
    const result = buildRagContext("q", [source({ content: "a".repeat(CONTEXT_BUILDER_DEFAULT_MAX_CONTEXT_CHARS + 1000) })]);
    expect(result.stats.contextTruncated).toBe(true);
    expect(result.stats.totalChars).toBeLessThanOrEqual(CONTEXT_BUILDER_DEFAULT_MAX_CONTEXT_CHARS);
  });
});

describe("buildRagContext — forma del resultado", () => {
  it("indexa las fuentes incluidas de forma 1-indexada y secuencial", () => {
    const result = buildRagContext("q", [source({ source_id: "a" }), source({ source_id: "b" })]);
    expect(result.sources.map((s) => s.index)).toEqual([1, 2]);
  });

  it("propaga el title opcional cuando viene, y lo deja undefined cuando no", () => {
    const result = buildRagContext("q", [source({ title: "Laptop X" }), source({ source_id: "sin-titulo" })]);
    expect(result.sources[0].title).toBe("Laptop X");
    expect(result.sources[1].title).toBeUndefined();
  });

  it("arma userMessage citando la query y el contenido numerado de cada fuente", () => {
    const result = buildRagContext("¿tienen laptops livianas?", [source({ content: "a".repeat(30) })]);
    expect(result.userMessage).toContain("¿tienen laptops livianas?");
    expect(result.userMessage).toContain("[1]");
  });
});
