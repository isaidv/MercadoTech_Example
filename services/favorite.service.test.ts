import { describe, expect, it } from "vitest";
import { isFavorite, toggle, listMine } from "./favorite.service";
import { mockSupabase, mockError } from "./test-utils/supabase-mock";

describe("isFavorite", () => {
  it("true si existe una fila", async () => {
    const supabase = mockSupabase({ tables: { favorites: { maybeSingle: { id: "f1" } } } });
    expect(await isFavorite("p1", "u1", supabase)).toBe(true);
  });

  it("false si no existe (maybeSingle sin fila)", async () => {
    const supabase = mockSupabase({ tables: { favorites: { maybeSingle: null } } });
    expect(await isFavorite("p1", "u1", supabase)).toBe(false);
  });

  it("propaga tal cual el error", async () => {
    const supabase = mockSupabase({ tables: { favorites: { maybeSingle: mockError(new Error("falló")) } } });
    await expect(isFavorite("p1", "u1", supabase)).rejects.toThrow("falló");
  });
});

describe("toggle", () => {
  it("si ya era favorito: borra y devuelve false", async () => {
    const supabase = mockSupabase({ tables: { favorites: { maybeSingle: { id: "f1" } } } });
    expect(await toggle("p1", "u1", supabase)).toBe(false);
    expect(supabase.deletes("favorites")).toHaveLength(1);
    expect(supabase.inserts("favorites")).toHaveLength(0);
  });

  it("si no era favorito: inserta y devuelve true", async () => {
    const supabase = mockSupabase({ tables: { favorites: { maybeSingle: null } } });
    expect(await toggle("p1", "u1", supabase)).toBe(true);
    expect(supabase.inserts("favorites")).toContainEqual({ product_id: "p1", user_id: "u1" });
    expect(supabase.deletes("favorites")).toHaveLength(0);
  });

  it("propaga tal cual el error del delete", async () => {
    const supabase = mockSupabase({ tables: { favorites: { maybeSingle: { id: "f1" }, deleteError: new Error("falló") } } });
    await expect(toggle("p1", "u1", supabase)).rejects.toThrow("falló");
  });

  it("propaga tal cual el error del insert", async () => {
    const supabase = mockSupabase({ tables: { favorites: { maybeSingle: null, insertError: new Error("falló") } } });
    await expect(toggle("p1", "u1", supabase)).rejects.toThrow("falló");
  });
});

describe("listMine", () => {
  it("mapea el producto anidado con el mismo shape que listActiveProducts", async () => {
    const supabase = mockSupabase({
      tables: {
        favorites: {
          select: [
            {
              product_id: "p1",
              created_at: "2026-01-01",
              products: {
                id: "p1",
                seller_id: "s1",
                category_id: "c1",
                title: "Laptop",
                description: null,
                brand: "Lenovo",
                condition: "nuevo",
                price: "999.00",
                stock: 1,
                is_active: true,
                created_at: "2026-01-01",
                updated_at: "2026-01-01",
                product_images: [],
                reviews: [],
              },
            },
          ],
        },
      },
    });
    const favorites = await listMine("u1", supabase);
    expect(favorites).toHaveLength(1);
    expect(favorites[0].price).toBe(999);
  });

  it("filtra en silencio un favorito cuyo producto el vendedor desactivó/borró (products: null, oculto por RLS)", async () => {
    const supabase = mockSupabase({
      tables: { favorites: { select: [{ product_id: "p1", created_at: "2026-01-01", products: null }] } },
    });
    expect(await listMine("u1", supabase)).toEqual([]);
  });

  it("propaga tal cual el error", async () => {
    const supabase = mockSupabase({ tables: { favorites: { select: mockError(new Error("falló")) } } });
    await expect(listMine("u1", supabase)).rejects.toThrow("falló");
  });
});
