import { describe, expect, it } from "vitest";
import { getItems, addItem, updateQuantity, removeItem, clear } from "./cart.service";
import { mockSupabase, mockError } from "./test-utils/supabase-mock";

/**
 * Fase 6.3 — Supabase SIEMPRE inyectado (nunca `vi.mock` del cliente ni
 * del módulo). Ancla real (decisión 5, MercadoTech_sesion6.md): `addItem`
 * SUMA el duplicado y recorta a `[1, stock]` — NO "rechaza" cantidades
 * bajas. La suite entera pasa con Docker apagado (nunca abre red).
 *
 * Casos enumerados leyendo cart.service.ts ANTES de escribir (RAZONAMIENTO
 * de esta fase): feliz (nuevo, duplicado), fronteras (suma exacta sin
 * recortar), errores de cada lectura/escritura propagados tal cual, y un
 * caso que difiere de lo esperado — ver el test marcado
 * "comportamiento actual, revisar" más abajo.
 */

describe("addItem", () => {
  it("producto sin fila existente en el carrito: inserta la cantidad pedida (recortada al stock)", async () => {
    const supabase = mockSupabase({
      tables: {
        products: { single: { stock: 10 } },
        cart_items: { maybeSingle: null }, // sin fila existente
      },
    });
    await addItem("u1", "p1", 3, supabase);
    expect(supabase.inserts("cart_items")).toContainEqual({ user_id: "u1", product_id: "p1", quantity: 3 });
    expect(supabase.updates("cart_items")).toHaveLength(0);
  });

  it("duplicado: SUMA las cantidades y recorta al stock (ancla de la decisión 5, ejemplo de la spec)", async () => {
    const supabase = mockSupabase({
      tables: {
        cart_items: { maybeSingle: { id: "c1", quantity: 3 } },
        products: { single: { stock: 4 } },
      },
    });
    await addItem("u1", "p1", 5, supabase);
    expect(supabase.updates("cart_items")).toContainEqual({ quantity: 4 }); // 3+5=8 → tope 4
  });

  it("duplicado sin llegar al tope: suma exacta, sin recortar", async () => {
    const supabase = mockSupabase({
      tables: {
        cart_items: { maybeSingle: { id: "c1", quantity: 1 } },
        products: { single: { stock: 10 } },
      },
    });
    await addItem("u1", "p1", 2, supabase);
    expect(supabase.updates("cart_items")).toContainEqual({ quantity: 3 }); // 1+2=3, no llega a 10
  });

  it("rechaza con el mensaje exacto cuando el producto no tiene stock, sin llegar a tocar cart_items", async () => {
    const supabase = mockSupabase({ tables: { products: { single: { stock: 0 } } } });
    await expect(addItem("u1", "p1", 1, supabase)).rejects.toThrow("Este producto no tiene stock disponible.");
    expect(supabase.inserts("cart_items")).toHaveLength(0);
    expect(supabase.updates("cart_items")).toHaveLength(0);
  });

  it("propaga tal cual el error de leer products", async () => {
    const supabase = mockSupabase({
      tables: { products: { single: mockError(new Error("La conexión con la base de datos falló.")) } },
    });
    await expect(addItem("u1", "p1", 1, supabase)).rejects.toThrow("La conexión con la base de datos falló.");
  });

  it("propaga tal cual el error de leer cart_items existente", async () => {
    const supabase = mockSupabase({
      tables: {
        products: { single: { stock: 5 } },
        cart_items: { maybeSingle: mockError(new Error("permission denied for table cart_items")) },
      },
    });
    await expect(addItem("u1", "p1", 1, supabase)).rejects.toThrow("permission denied for table cart_items");
  });

  it("propaga tal cual el error del update (duplicado)", async () => {
    const supabase = mockSupabase({
      tables: {
        products: { single: { stock: 5 } },
        cart_items: { maybeSingle: { id: "c1", quantity: 1 }, updateError: new Error("update falló") },
      },
    });
    await expect(addItem("u1", "p1", 1, supabase)).rejects.toThrow("update falló");
  });

  it("propaga tal cual el error del insert (nuevo)", async () => {
    const supabase = mockSupabase({
      tables: {
        products: { single: { stock: 5 } },
        cart_items: { maybeSingle: null, insertError: new Error("insert falló") },
      },
    });
    await expect(addItem("u1", "p1", 1, supabase)).rejects.toThrow("insert falló");
  });

  it("comportamiento actual, revisar: quantity=0 sin fila existente NO se valida — inserta con quantity:0, que el check constraint real de la BD (quantity > 0) rechazaría con un error crudo de Postgres en vez de un mensaje legible", async () => {
    const supabase = mockSupabase({
      tables: { products: { single: { stock: 5 } }, cart_items: { maybeSingle: null } },
    });
    await addItem("u1", "p1", 0, supabase);
    expect(supabase.inserts("cart_items")).toContainEqual({ user_id: "u1", product_id: "p1", quantity: 0 });
  });
});

describe("getItems", () => {
  it("mapea la fila incluyendo la portada por menor position y price a number", async () => {
    const supabase = mockSupabase({
      tables: {
        cart_items: {
          select: [
            {
              id: "c1",
              user_id: "u1",
              product_id: "p1",
              quantity: 2,
              created_at: "2026-01-01",
              products: {
                id: "p1",
                title: "Laptop",
                price: "1999.90", // TRAMPA de PostgREST: numeric llega como string
                stock: 5,
                product_images: [
                  { image_path: "u1/p1/2.jpg", position: 1 },
                  { image_path: "u1/p1/1.jpg", position: 0 },
                ],
              },
            },
          ],
        },
      },
    });
    const items = await getItems("u1", supabase);
    expect(items).toHaveLength(1);
    expect(items[0].product?.price).toBe(1999.9);
    expect(items[0].product?.image_url).toContain("1.jpg"); // portada = menor position
  });

  it("un item cuyo producto fue desactivado/borrado llega con product: null y no rompe el mapeo", async () => {
    const supabase = mockSupabase({
      tables: {
        cart_items: {
          select: [{ id: "c1", user_id: "u1", product_id: "p1", quantity: 1, created_at: "2026-01-01", products: null }],
        },
      },
    });
    const items = await getItems("u1", supabase);
    expect(items[0].product).toBeNull();
  });

  it("propaga tal cual el error de la consulta", async () => {
    const supabase = mockSupabase({ tables: { cart_items: { select: mockError(new Error("timeout")) } } });
    await expect(getItems("u1", supabase)).rejects.toThrow("timeout");
  });
});

describe("updateQuantity", () => {
  it("caso feliz: manda el update con la cantidad pedida", async () => {
    const supabase = mockSupabase({ tables: { cart_items: {} } });
    await updateQuantity("c1", 5, supabase);
    expect(supabase.updates("cart_items")).toContainEqual({ quantity: 5 });
  });

  it("propaga tal cual el error", async () => {
    const supabase = mockSupabase({ tables: { cart_items: { updateError: new Error("fila no encontrada") } } });
    await expect(updateQuantity("c1", 5, supabase)).rejects.toThrow("fila no encontrada");
  });
});

describe("removeItem", () => {
  it("caso feliz: dispara el delete", async () => {
    const supabase = mockSupabase({ tables: { cart_items: {} } });
    await removeItem("c1", supabase);
    expect(supabase.deletes("cart_items")).toHaveLength(1);
  });

  it("propaga tal cual el error", async () => {
    const supabase = mockSupabase({ tables: { cart_items: { deleteError: new Error("no autorizado") } } });
    await expect(removeItem("c1", supabase)).rejects.toThrow("no autorizado");
  });
});

describe("clear", () => {
  it("caso feliz: dispara el delete por user_id", async () => {
    const supabase = mockSupabase({ tables: { cart_items: {} } });
    await clear("u1", supabase);
    expect(supabase.deletes("cart_items")).toHaveLength(1);
  });

  it("propaga tal cual el error", async () => {
    const supabase = mockSupabase({ tables: { cart_items: { deleteError: new Error("falló") } } });
    await expect(clear("u1", supabase)).rejects.toThrow("falló");
  });
});
