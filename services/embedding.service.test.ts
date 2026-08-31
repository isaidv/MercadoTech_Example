import { describe, expect, it, vi } from "vitest";
import { mockSupabase, mockError } from "./test-utils/supabase-mock";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { indexSource } from "./embedding.service";

/**
 * Fase 6.3, decisión 7 — ÚNICA excepción a "Supabase siempre inyectado":
 * `embedding.service.ts` importa `lib/ai/embeddings` directo (no
 * inyectable, diseño de la sesión 4), así que acá SÍ hace falta
 * `vi.mock("@/lib/ai/embeddings")`.
 *
 * Mock PARCIAL (`importOriginal`): solo se reemplaza `generateEmbedding`
 * (la única función que toca la red, vía `fetch`) — `buildProductEmbeddingText`/
 * `buildSupportArticleEmbeddingText` quedan REALES, así el test puede
 * afirmar que el texto que realmente arma esa función es el que termina en
 * el `content` del upsert, no un texto inventado por el test.
 */
vi.mock("@/lib/ai/embeddings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/embeddings")>();
  return { ...actual, generateEmbedding: vi.fn() };
});

const FAKE_VECTOR = Array.from({ length: 1024 }, () => 0.1);

describe("indexSource — producto", () => {
  it("construye el texto real (buildProductEmbeddingText) y hace upsert con onConflict", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue(FAKE_VECTOR);
    const supabase = mockSupabase({
      tables: {
        products: { single: { title: "Laptop Lenovo", brand: "Lenovo", condition: "nuevo", description: "16GB RAM", category_id: "c1" } },
        categories: { single: { name: "Laptops" } },
      },
    });

    await indexSource("producto", "p1", supabase);

    // generateEmbedding se llamó con input_type "document" (fichado, nunca "query") y el texto real construido.
    expect(vi.mocked(generateEmbedding)).toHaveBeenCalledWith(expect.stringContaining("Título: Laptop Lenovo"), "document");
    expect(vi.mocked(generateEmbedding)).toHaveBeenCalledWith(expect.stringContaining("Categoría: Laptops"), "document");

    const [upsertPayload] = supabase.upserts("knowledge_embeddings") as [Record<string, unknown>];
    expect(upsertPayload.source_type).toBe("producto");
    expect(upsertPayload.source_id).toBe("p1");
    expect(upsertPayload.content).toContain("Título: Laptop Lenovo");
    expect(upsertPayload.embedding).toBe(`[${FAKE_VECTOR.join(",")}]`); // el vector viaja como string, no como array JS
  });

  it("propaga tal cual el error del proveedor", async () => {
    vi.mocked(generateEmbedding).mockRejectedValue(new Error("Voyage (embeddings) devolvió límite de tasa (429)"));
    const supabase = mockSupabase({
      tables: {
        products: { single: { title: "X", brand: null, condition: "nuevo", description: null, category_id: "c1" } },
        categories: { single: { name: "Y" } },
      },
    });
    await expect(indexSource("producto", "p1", supabase)).rejects.toThrow("límite de tasa (429)");
  });

  it("propaga tal cual el error si falla la lectura del producto (nunca llega a llamar a generateEmbedding)", async () => {
    const supabase = mockSupabase({ tables: { products: { single: mockError(new Error("no encontrado")) } } });
    await expect(indexSource("producto", "p-x", supabase)).rejects.toThrow("no encontrado");
  });
});

describe("indexSource — artículo de soporte", () => {
  it("construye el texto real (buildSupportArticleEmbeddingText) y hace upsert", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue(FAKE_VECTOR);
    const supabase = mockSupabase({
      tables: { support_articles: { single: { title: "Devoluciones", category: "Pagos", content: "Tenés 7 días..." } } },
    });

    await indexSource("articulo_soporte", "a1", supabase);

    expect(vi.mocked(generateEmbedding)).toHaveBeenCalledWith(expect.stringContaining("Título: Devoluciones"), "document");
    const [upsertPayload] = supabase.upserts("knowledge_embeddings") as [Record<string, unknown>];
    expect(upsertPayload.source_type).toBe("articulo_soporte");
  });

  it("propaga tal cual el error del upsert", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue(FAKE_VECTOR);
    const supabase = mockSupabase({
      tables: {
        support_articles: { single: { title: "X", category: null, content: "Y" } },
        knowledge_embeddings: { upsertError: new Error("permission denied") },
      },
    });
    await expect(indexSource("articulo_soporte", "a1", supabase)).rejects.toThrow("permission denied");
  });
});
