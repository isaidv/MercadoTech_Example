import { describe, expect, it, vi, beforeEach } from "vitest";
import { mockSupabase } from "./test-utils/supabase-mock";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { generateCompletion } from "@/lib/ai/completion";
import { ask } from "./chat.service";
import { SHOPPING_SYSTEM_INSTRUCTIONS, SUPPORT_SYSTEM_INSTRUCTIONS } from "@/lib/ai/prompts";

/**
 * Fase 6.3, decisión 7 — `chat.service.ts` orquesta `vector-search.service`
 * (REAL, no mockeado — recibe el `supabase` inyectado) + `context-builder`
 * (REAL, puro) + `lib/ai/completion` (MOCKEADO por módulo — es la única
 * excepción de la decisión 7, junto a `lib/ai/embeddings`, usado
 * transitivamente por `vector-search.service.searchKnowledge`).
 */
vi.mock("@/lib/ai/embeddings", () => ({ generateEmbedding: vi.fn() }));
vi.mock("@/lib/ai/completion", () => ({ generateCompletion: vi.fn() }));

const RELEVANT_MATCH = {
  source_type: "producto",
  source_id: "p1",
  content: "Laptop Lenovo IdeaPad, 16GB RAM, ideal para diseño gráfico y edición de video",
  metadata: { title: "Laptop Lenovo IdeaPad" },
  similarity: 0.9,
};

beforeEach(() => {
  vi.mocked(generateEmbedding).mockReset();
  vi.mocked(generateCompletion).mockReset();
});

describe("ask — orden búsqueda -> contexto -> completion", () => {
  it("llama a generateEmbedding (búsqueda) ANTES que a generateCompletion (redacción)", async () => {
    const calls: string[] = [];
    vi.mocked(generateEmbedding).mockImplementation(async () => {
      calls.push("busqueda");
      return [0.1];
    });
    vi.mocked(generateCompletion).mockImplementation(async () => {
      calls.push("completion");
      return { text: "respuesta", model: "claude-haiku-4-5", stopReason: "end_turn" };
    });
    const supabase = mockSupabase({ rpc: { match_knowledge: [RELEVANT_MATCH] } });

    await ask("¿qué laptops tienen?", "compras", {}, supabase);

    expect(calls).toEqual(["busqueda", "completion"]);
  });
});

describe("ask — modos", () => {
  it("modo 'compras': busca source_type 'producto' y usa SHOPPING_SYSTEM_INSTRUCTIONS", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue([0.1]);
    vi.mocked(generateCompletion).mockResolvedValue({ text: "x", model: "m", stopReason: null });
    const supabase = mockSupabase({ rpc: { match_knowledge: [RELEVANT_MATCH] } });

    await ask("q", "compras", {}, supabase);

    expect(supabase.rpcCalls("match_knowledge")).toContainEqual(
      expect.objectContaining({ p_source_type: "producto" }),
    );
    expect(vi.mocked(generateCompletion)).toHaveBeenCalledWith(SHOPPING_SYSTEM_INSTRUCTIONS, expect.any(String));
  });

  it("modo 'soporte': busca source_type 'articulo_soporte' y usa SUPPORT_SYSTEM_INSTRUCTIONS", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue([0.1]);
    vi.mocked(generateCompletion).mockResolvedValue({ text: "x", model: "m", stopReason: null });
    const supabase = mockSupabase({
      rpc: { match_knowledge: [{ ...RELEVANT_MATCH, source_type: "articulo_soporte" }] },
    });

    await ask("q", "soporte", {}, supabase);

    expect(supabase.rpcCalls("match_knowledge")).toContainEqual(
      expect.objectContaining({ p_source_type: "articulo_soporte" }),
    );
    expect(vi.mocked(generateCompletion)).toHaveBeenCalledWith(SUPPORT_SYSTEM_INSTRUCTIONS, expect.any(String));
  });
});

describe("ask — hasRelevantContext y metadata", () => {
  it("hay fuentes relevantes: hasRelevantContext=true, sources con index/title/similarity reales", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue([0.1]);
    vi.mocked(generateCompletion).mockResolvedValue({ text: "respuesta con [1]", model: "claude-haiku-4-5", stopReason: "end_turn" });
    const supabase = mockSupabase({ rpc: { match_knowledge: [RELEVANT_MATCH] } });

    const result = await ask("¿qué laptops tienen?", "compras", {}, supabase);

    expect(result.hasRelevantContext).toBe(true);
    expect(result.sources).toEqual([
      { index: 1, source_type: "producto", source_id: "p1", title: "Laptop Lenovo IdeaPad", similarity: 0.9 },
    ]);
    expect(result.metadata).toEqual({
      model: "claude-haiku-4-5",
      retrievedCount: 1,
      usedSourceCount: 1,
      contextTruncated: false,
    });
  });

  it("SIN fuentes relevantes (0 matches del RPC): hasRelevantContext=false, PERO generateCompletion SE LLAMA IGUAL (comportamiento de la sesión 4, no un atajo local)", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue([0.1]);
    vi.mocked(generateCompletion).mockResolvedValue({ text: "¿qué tipo de producto buscás?", model: "claude-haiku-4-5", stopReason: "end_turn" });
    const supabase = mockSupabase({ rpc: { match_knowledge: [] } });

    const result = await ask("qué productos tienes", "compras", {}, supabase);

    expect(result.hasRelevantContext).toBe(false);
    expect(result.sources).toEqual([]);
    expect(vi.mocked(generateCompletion)).toHaveBeenCalledTimes(1);
    // El mensaje de usuario sin fuentes lo arma buildRagUserMessage (real, ya testeado en 6.2) — acá solo se confirma que SÍ se le pasa algo a completion.
    expect(vi.mocked(generateCompletion)).toHaveBeenCalledWith(expect.any(String), expect.stringContaining("No se encontró ninguna fuente relevante"));
  });

  it("matches por debajo del umbral de similitud: el context-builder real los descarta, hasRelevantContext=false igual", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue([0.1]);
    vi.mocked(generateCompletion).mockResolvedValue({ text: "x", model: "m", stopReason: null });
    const supabase = mockSupabase({
      rpc: { match_knowledge: [{ ...RELEVANT_MATCH, similarity: 0.1 }] }, // muy bajo, el builder real lo filtra
    });

    const result = await ask("q", "compras", {}, supabase);

    expect(result.hasRelevantContext).toBe(false);
    expect(result.metadata.retrievedCount).toBe(1); // el RPC SÍ devolvió algo...
    expect(result.metadata.usedSourceCount).toBe(0); // ...pero el builder no lo usó
  });
});

describe("ask — errores", () => {
  it("propaga tal cual el error de generar el embedding de búsqueda", async () => {
    vi.mocked(generateEmbedding).mockRejectedValue(new Error("Falta VOYAGE_API_KEY en .env.local"));
    const supabase = mockSupabase();
    await expect(ask("q", "compras", {}, supabase)).rejects.toThrow("Falta VOYAGE_API_KEY en .env.local");
    expect(vi.mocked(generateCompletion)).not.toHaveBeenCalled();
  });

  it("propaga tal cual el error de generar la respuesta", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue([0.1]);
    vi.mocked(generateCompletion).mockRejectedValue(new Error("Claude (chat) devolvió límite de tasa (429)"));
    const supabase = mockSupabase({ rpc: { match_knowledge: [RELEVANT_MATCH] } });
    await expect(ask("q", "compras", {}, supabase)).rejects.toThrow("límite de tasa (429)");
  });
});
