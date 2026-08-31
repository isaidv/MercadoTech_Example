import { describe, expect, it } from "vitest";
import { listByProduct, getAverage, canReview, create } from "./review.service";
import { mockSupabase, mockError } from "./test-utils/supabase-mock";

describe("listByProduct", () => {
  it("caso feliz", async () => {
    const supabase = mockSupabase({ tables: { reviews: { select: [{ id: "r1", rating: 5 }] } } });
    expect(await listByProduct("p1", supabase)).toHaveLength(1);
  });

  it("propaga tal cual el error", async () => {
    const supabase = mockSupabase({ tables: { reviews: { select: mockError(new Error("falló")) } } });
    await expect(listByProduct("p1", supabase)).rejects.toThrow("falló");
  });
});

describe("getAverage", () => {
  it("sin reseñas: {average: null, count: 0}", async () => {
    const supabase = mockSupabase({ tables: { reviews: { select: [] } } });
    expect(await getAverage("p1", supabase)).toEqual({ average: null, count: 0 });
  });

  it("con reseñas: promedio real", async () => {
    const supabase = mockSupabase({ tables: { reviews: { select: [{ rating: 4 }, { rating: 5 }, { rating: 3 }] } } });
    expect(await getAverage("p1", supabase)).toEqual({ average: 4, count: 3 });
  });

  it("propaga tal cual el error", async () => {
    const supabase = mockSupabase({ tables: { reviews: { select: mockError(new Error("falló")) } } });
    await expect(getAverage("p1", supabase)).rejects.toThrow("falló");
  });
});

describe("canReview", () => {
  it("false si ya existe una reseña del comprador para este producto (no llega a consultar orders)", async () => {
    const supabase = mockSupabase({ tables: { reviews: { maybeSingle: { id: "r-existente" } } } });
    expect(await canReview("p1", "b1", supabase)).toEqual({ allowed: false, orderId: null });
  });

  it("false si no hay ningún pedido 'entregado' del comprador con este producto", async () => {
    const supabase = mockSupabase({
      tables: { reviews: { maybeSingle: null }, orders: { select: [] } },
    });
    expect(await canReview("p1", "b1", supabase)).toEqual({ allowed: false, orderId: null });
  });

  it("true con {allowed, orderId} correcto cuando sí hay un pedido entregado con ese producto", async () => {
    const supabase = mockSupabase({
      tables: { reviews: { maybeSingle: null }, orders: { select: [{ id: "o1" }] } },
    });
    expect(await canReview("p1", "b1", supabase)).toEqual({ allowed: true, orderId: "o1" });
  });

  it("propaga tal cual el error de leer reviews", async () => {
    const supabase = mockSupabase({ tables: { reviews: { maybeSingle: mockError(new Error("falló")) } } });
    await expect(canReview("p1", "b1", supabase)).rejects.toThrow("falló");
  });

  it("propaga tal cual el error de leer orders", async () => {
    const supabase = mockSupabase({
      tables: { reviews: { maybeSingle: null }, orders: { select: mockError(new Error("falló")) } },
    });
    await expect(canReview("p1", "b1", supabase)).rejects.toThrow("falló");
  });
});

describe("create", () => {
  it("caso feliz: manda comment null si no viene", async () => {
    const supabase = mockSupabase({ tables: { reviews: { single: { id: "r1", rating: 5 } } } });
    await create({ productId: "p1", orderId: "o1", buyerId: "b1", rating: 5 }, supabase);
    expect(supabase.inserts("reviews")).toContainEqual({
      product_id: "p1",
      buyer_id: "b1",
      order_id: "o1",
      rating: 5,
      comment: null,
    });
  });

  it("propaga tal cual el error (ej. RLS: no verified purchase)", async () => {
    const supabase = mockSupabase({ tables: { reviews: { single: mockError(new Error("new row violates row-level security policy")) } } });
    await expect(create({ productId: "p1", orderId: "o1", buyerId: "b1", rating: 5 }, supabase)).rejects.toThrow(
      "new row violates row-level security policy",
    );
  });
});
