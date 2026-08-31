import { describe, expect, it } from "vitest";
import { listActiveProducts, getProductById, getProductImages, registerView } from "./product.service";
import { mockSupabase, mockError } from "./test-utils/supabase-mock";
import { PRODUCTS_PAGE_SIZE } from "@/lib/constants/catalog";

/**
 * Fase 6.3 — Supabase inyectado. `filterCalls()` del mock verifica que los
 * filtros de `ProductFilters` realmente se traducen a la llamada correcta
 * de query builder, sin reimplementar Postgrest.
 */

function productRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "p1",
    seller_id: "s1",
    category_id: "c1",
    title: "Laptop",
    description: null,
    brand: "Lenovo",
    condition: "nuevo",
    price: "1999.90",
    stock: 5,
    is_active: true,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    product_images: [
      { image_path: "p1/2.jpg", position: 1 },
      { image_path: "p1/1.jpg", position: 0 },
    ],
    reviews: [{ rating: 4 }, { rating: 5 }],
    ...overrides,
  };
}

describe("listActiveProducts", () => {
  it("siempre filtra por is_active=true y ordena por más reciente por default", async () => {
    const supabase = mockSupabase({ tables: { products: { select: [productRow()], count: 1 } } });
    await listActiveProducts({}, supabase);
    expect(supabase.filterCalls("products", "eq")).toContainEqual(["is_active", true]);
    expect(supabase.filterCalls("products", "order")).toContainEqual(["created_at", { ascending: false }]);
  });

  it("categorySlug: resuelve el id en categories y filtra products por category_id", async () => {
    const supabase = mockSupabase({
      tables: {
        categories: { single: { id: "cat-9" } },
        products: { select: [productRow()], count: 1 },
      },
    });
    await listActiveProducts({ categorySlug: "laptops" }, supabase);
    expect(supabase.filterCalls("categories", "eq")).toContainEqual(["slug", "laptops"]);
    expect(supabase.filterCalls("products", "eq")).toContainEqual(["category_id", "cat-9"]);
  });

  it("propaga tal cual el error si el slug de categoría no existe", async () => {
    const supabase = mockSupabase({ tables: { categories: { single: mockError(new Error("no encontrada")) } } });
    await expect(listActiveProducts({ categorySlug: "no-existe" }, supabase)).rejects.toThrow("no encontrada");
  });

  it("search: arma el or() de ilike sobre title y brand con el término entre %...%", async () => {
    const supabase = mockSupabase({ tables: { products: { select: [], count: 0 } } });
    await listActiveProducts({ search: "laptop" }, supabase);
    expect(supabase.filterCalls("products", "or")).toContainEqual(["title.ilike.%laptop%,brand.ilike.%laptop%"]);
  });

  it("condition: filtra con in() solo si viene al menos una condición", async () => {
    const supabase = mockSupabase({ tables: { products: { select: [], count: 0 } } });
    await listActiveProducts({ condition: ["nuevo", "usado"] }, supabase);
    expect(supabase.filterCalls("products", "in")).toContainEqual(["condition", ["nuevo", "usado"]]);
  });

  it("condition vacío no llama a in()", async () => {
    const supabase = mockSupabase({ tables: { products: { select: [], count: 0 } } });
    await listActiveProducts({ condition: [] }, supabase);
    expect(supabase.filterCalls("products", "in")).toHaveLength(0);
  });

  it("minPrice/maxPrice: gte/lte con los valores exactos", async () => {
    const supabase = mockSupabase({ tables: { products: { select: [], count: 0 } } });
    await listActiveProducts({ minPrice: 100, maxPrice: 5000 }, supabase);
    expect(supabase.filterCalls("products", "gte")).toContainEqual(["price", 100]);
    expect(supabase.filterCalls("products", "lte")).toContainEqual(["price", 5000]);
  });

  it("sort=precio_asc ordena price ascendente; sort=precio_desc, descendente", async () => {
    const supabase = mockSupabase({ tables: { products: { select: [], count: 0 } } });
    await listActiveProducts({ sort: "precio_asc" }, supabase);
    expect(supabase.filterCalls("products", "order")).toContainEqual(["price", { ascending: true }]);

    const supabase2 = mockSupabase({ tables: { products: { select: [], count: 0 } } });
    await listActiveProducts({ sort: "precio_desc" }, supabase2);
    expect(supabase2.filterCalls("products", "order")).toContainEqual(["price", { ascending: false }]);
  });

  it("página 1 (o sin page) pide range(0, PRODUCTS_PAGE_SIZE-1); página 2, la siguiente ventana", async () => {
    const supabase = mockSupabase({ tables: { products: { select: [], count: 0 } } });
    await listActiveProducts({}, supabase);
    expect(supabase.filterCalls("products", "range")).toContainEqual([0, PRODUCTS_PAGE_SIZE - 1]);

    const supabase2 = mockSupabase({ tables: { products: { select: [], count: 0 } } });
    await listActiveProducts({ page: 2 }, supabase2);
    expect(supabase2.filterCalls("products", "range")).toContainEqual([PRODUCTS_PAGE_SIZE, PRODUCTS_PAGE_SIZE * 2 - 1]);
  });

  it("mapea price string->number, portada por menor position, y average_rating/review_count desde reviews", async () => {
    const supabase = mockSupabase({ tables: { products: { select: [productRow()], count: 1 } } });
    const { items, total } = await listActiveProducts({}, supabase);
    expect(total).toBe(1);
    expect(items[0].price).toBe(1999.9);
    expect(items[0].image_url).toContain("1.jpg"); // position 0, la más baja
    expect(items[0].average_rating).toBe(4.5);
    expect(items[0].review_count).toBe(2);
  });

  it("un producto sin reviews tiene average_rating null y review_count 0", async () => {
    const supabase = mockSupabase({ tables: { products: { select: [productRow({ reviews: [] })], count: 1 } } });
    const { items } = await listActiveProducts({}, supabase);
    expect(items[0].average_rating).toBeNull();
    expect(items[0].review_count).toBe(0);
  });

  it("un producto sin imágenes tiene image_url null", async () => {
    const supabase = mockSupabase({ tables: { products: { select: [productRow({ product_images: [] })], count: 1 } } });
    const { items } = await listActiveProducts({}, supabase);
    expect(items[0].image_url).toBeNull();
  });

  it("propaga tal cual el error de la consulta final", async () => {
    const supabase = mockSupabase({ tables: { products: { select: mockError(new Error("timeout")) } } });
    await expect(listActiveProducts({}, supabase)).rejects.toThrow("timeout");
  });
});

describe("getProductById", () => {
  it("caso feliz", async () => {
    const supabase = mockSupabase({ tables: { products: { single: productRow() } } });
    const product = await getProductById("p1", supabase);
    expect(product.price).toBe(1999.9);
  });

  it("propaga tal cual el error", async () => {
    const supabase = mockSupabase({ tables: { products: { single: mockError(new Error("no encontrado")) } } });
    await expect(getProductById("p-x", supabase)).rejects.toThrow("no encontrado");
  });
});

describe("getProductImages", () => {
  it("caso feliz", async () => {
    const supabase = mockSupabase({ tables: { product_images: { select: [{ id: "i1", position: 0 }] } } });
    expect(await getProductImages("p1", supabase)).toHaveLength(1);
  });

  it("propaga tal cual el error", async () => {
    const supabase = mockSupabase({ tables: { product_images: { select: mockError(new Error("falló")) } } });
    await expect(getProductImages("p1", supabase)).rejects.toThrow("falló");
  });
});

describe("registerView", () => {
  it("caso feliz: inserta product_id y user_id", async () => {
    const supabase = mockSupabase({ tables: { product_views: {} } });
    await registerView("p1", "u1", supabase);
    expect(supabase.inserts("product_views")).toContainEqual({ product_id: "p1", user_id: "u1" });
  });

  it("propaga tal cual el error", async () => {
    const supabase = mockSupabase({ tables: { product_views: { insertError: new Error("duplicado") } } });
    await expect(registerView("p1", "u1", supabase)).rejects.toThrow("duplicado");
  });
});
