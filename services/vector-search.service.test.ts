import { describe, expect, it, vi } from "vitest";
import { mockSupabase, mockError } from "./test-utils/supabase-mock";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { searchByEmbedding, searchKnowledge, searchProducts } from "./vector-search.service";
import { VECTOR_SEARCH_DEFAULT_TOP_K, VECTOR_SEARCH_MAX_TOP_K, VECTOR_SEARCH_DEFAULT_SIMILARITY_THRESHOLD } from "@/lib/constants/ai";

/** Fase 6.3, decisión 7 — vi.mock SOLO de generateEmbedding (lib/ai/*, la única excepción). El RPC se resuelve vía el supabase inyectado, como todo lo demás. */
vi.mock("@/lib/ai/embeddings", () => ({ generateEmbedding: vi.fn() }));

describe("searchByEmbedding", () => {
  it("manda el embedding como string, con los defaults reales de lib/constants/ai.ts", async () => {
    const supabase = mockSupabase({ rpc: { match_knowledge: [] } });
    await searchByEmbedding([0.1, 0.2], {}, supabase);
    expect(supabase.rpcCalls("match_knowledge")).toContainEqual({
      query_embedding: "[0.1,0.2]",
      p_source_type: null,
      match_count: VECTOR_SEARCH_DEFAULT_TOP_K,
      similarity_threshold: VECTOR_SEARCH_DEFAULT_SIMILARITY_THRESHOLD,
    });
  });

  it("respeta topK y similarityThreshold explícitos", async () => {
    const supabase = mockSupabase({ rpc: { match_knowledge: [] } });
    await searchByEmbedding([0.1], { topK: 3, similarityThreshold: 0.6, sourceType: "producto" }, supabase);
    expect(supabase.rpcCalls("match_knowledge")).toContainEqual({
      query_embedding: "[0.1]",
      p_source_type: "producto",
      match_count: 3,
      similarity_threshold: 0.6,
    });
  });

  it("topK nunca supera VECTOR_SEARCH_MAX_TOP_K aunque se pida más", async () => {
    const supabase = mockSupabase({ rpc: { match_knowledge: [] } });
    await searchByEmbedding([0.1], { topK: VECTOR_SEARCH_MAX_TOP_K + 50 }, supabase);
    const [call] = supabase.rpcCalls("match_knowledge") as [Record<string, unknown>];
    expect(call.match_count).toBe(VECTOR_SEARCH_MAX_TOP_K);
  });

  it("propaga tal cual el error del RPC", async () => {
    const supabase = mockSupabase({ rpc: { match_knowledge: mockError(new Error("function match_knowledge does not exist")) } });
    await expect(searchByEmbedding([0.1], {}, supabase)).rejects.toThrow("function match_knowledge does not exist");
  });
});

describe("searchKnowledge", () => {
  it("genera el embedding con input_type 'query' (nunca 'document' — es búsqueda, no fichado) y filtra por sourceType", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue([0.5]);
    const supabase = mockSupabase({ rpc: { match_knowledge: [{ source_type: "articulo_soporte", source_id: "a1", content: "x", metadata: {}, similarity: 0.9 }] } });
    const results = await searchKnowledge("¿cómo devuelvo?", "articulo_soporte", {}, supabase);
    expect(generateEmbedding).toHaveBeenCalledWith("¿cómo devuelvo?", "query");
    expect(results).toHaveLength(1);
  });
});

describe("searchProducts", () => {
  it("lista vacía de matches: no llega a consultar products", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue([0.1]);
    const supabase = mockSupabase({ rpc: { match_knowledge: [] } });
    expect(await searchProducts("laptop liviana", {}, supabase)).toEqual([]);
  });

  it("descarta en silencio un match huérfano (producto borrado o inactivo — no está en la respuesta de products)", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue([0.1]);
    const supabase = mockSupabase({
      rpc: {
        match_knowledge: [
          { source_type: "producto", source_id: "vivo", content: "x", metadata: {}, similarity: 0.9 },
          { source_type: "producto", source_id: "huerfano", content: "x", metadata: {}, similarity: 0.8 },
        ],
      },
      tables: {
        products: {
          select: [
            {
              id: "vivo",
              seller_id: "s1",
              category_id: "c1",
              title: "Laptop",
              description: null,
              brand: null,
              condition: "nuevo",
              price: "999.00",
              stock: 1,
              is_active: true,
              created_at: "2026-01-01",
              updated_at: "2026-01-01",
              product_images: [],
              reviews: [],
            },
          ],
        },
      },
    });
    const results = await searchProducts("laptop", {}, supabase);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("vivo");
    expect(supabase.filterCalls("products", "eq")).toContainEqual(["is_active", true]);
  });

  it("conserva el orden de similitud del RPC, no el que devuelva la consulta a products", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue([0.1]);
    const baseProduct = {
      seller_id: "s1", category_id: "c1", title: "X", description: null, brand: null, condition: "nuevo",
      price: "10.00", stock: 1, is_active: true, created_at: "2026-01-01", updated_at: "2026-01-01",
      product_images: [], reviews: [],
    };
    const supabase = mockSupabase({
      rpc: {
        match_knowledge: [
          { source_type: "producto", source_id: "mas-relevante", content: "x", metadata: {}, similarity: 0.95 },
          { source_type: "producto", source_id: "menos-relevante", content: "x", metadata: {}, similarity: 0.5 },
        ],
      },
      // A propósito en orden INVERSO al de match_knowledge — Postgres no garantiza el orden de un `in (...)`.
      tables: { products: { select: [{ id: "menos-relevante", ...baseProduct }, { id: "mas-relevante", ...baseProduct }] } },
    });
    const results = await searchProducts("x", {}, supabase);
    expect(results.map((r) => r.id)).toEqual(["mas-relevante", "menos-relevante"]);
  });

  it("propaga tal cual el error de generar el embedding", async () => {
    vi.mocked(generateEmbedding).mockRejectedValue(new Error("Falta VOYAGE_API_KEY"));
    const supabase = mockSupabase();
    await expect(searchProducts("x", {}, supabase)).rejects.toThrow("Falta VOYAGE_API_KEY");
  });

  it("propaga tal cual el error de hidratar contra products", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue([0.1]);
    const supabase = mockSupabase({
      rpc: { match_knowledge: [{ source_type: "producto", source_id: "p1", content: "x", metadata: {}, similarity: 0.9 }] },
      tables: { products: { select: mockError(new Error("falló")) } },
    });
    await expect(searchProducts("x", {}, supabase)).rejects.toThrow("falló");
  });
});
