import { describe, expect, it } from "vitest";
import { listByProduct, create, answer } from "./question.service";
import { mockSupabase, mockError } from "./test-utils/supabase-mock";

describe("listByProduct", () => {
  it("caso feliz", async () => {
    const supabase = mockSupabase({ tables: { questions: { select: [{ id: "q1" }] } } });
    expect(await listByProduct("p1", supabase)).toHaveLength(1);
  });

  it("propaga tal cual el error", async () => {
    const supabase = mockSupabase({ tables: { questions: { select: mockError(new Error("falló")) } } });
    await expect(listByProduct("p1", supabase)).rejects.toThrow("falló");
  });
});

describe("create", () => {
  it("caso feliz: inserta con product_id/user_id/question", async () => {
    const supabase = mockSupabase({ tables: { questions: { single: { id: "q1", question: "¿Trae cargador?" } } } });
    await create("p1", "u1", "¿Trae cargador?", supabase);
    expect(supabase.inserts("questions")).toContainEqual({ product_id: "p1", user_id: "u1", question: "¿Trae cargador?" });
  });

  it("propaga tal cual el error", async () => {
    const supabase = mockSupabase({ tables: { questions: { single: mockError(new Error("falló")) } } });
    await expect(create("p1", "u1", "¿?", supabase)).rejects.toThrow("falló");
  });
});

describe("answer", () => {
  it("caso feliz: SOLO manda answer/answered_at, nunca question/user_id/product_id", async () => {
    const supabase = mockSupabase({ tables: { questions: { single: { id: "q1", answer: "Sí" } } } });
    await answer("q1", "Sí", supabase);
    const [payload] = supabase.updates("questions") as [Record<string, unknown>];
    expect(Object.keys(payload).sort()).toEqual(["answer", "answered_at"]);
    expect(payload.answer).toBe("Sí");
  });

  it("propaga tal cual el error", async () => {
    const supabase = mockSupabase({ tables: { questions: { single: mockError(new Error("falló")) } } });
    await expect(answer("q1", "Sí", supabase)).rejects.toThrow("falló");
  });
});
