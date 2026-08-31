import { describe, expect, it } from "vitest";
import { listMyProducts, createProduct, updateProduct, toggleActive, deleteProduct, listMyOrders, updateOrderStatus } from "./seller.service";
import { mockSupabase, mockError } from "./test-utils/supabase-mock";

/**
 * Fase 6.3 — Supabase inyectado. Ancla real (decisión 4,
 * MercadoTech_sesion6.md): `updateOrderStatus` NO valida la secuencia de
 * transición — solo manda el status destino. Esa validación vive en
 * `hooks/useSellerOrders.ts` (ver useSellerOrders.test.ts), no acá.
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
    price: "999.00",
    stock: 3,
    is_active: false, // a propósito: el vendedor SÍ debe ver sus inactivos
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    product_images: [],
    reviews: [],
    ...overrides,
  };
}

describe("listMyProducts", () => {
  it("incluye productos inactivos del propio vendedor (no filtra por is_active)", async () => {
    const supabase = mockSupabase({ tables: { products: { select: [productRow()] } } });
    const products = await listMyProducts("s1", supabase);
    expect(products).toHaveLength(1);
    expect(products[0].is_active).toBe(false);
    expect(supabase.filterCalls("products", "eq")).toContainEqual(["seller_id", "s1"]);
    expect(supabase.filterCalls("products", "eq")).not.toContainEqual(["is_active", true]);
  });

  it("propaga tal cual el error", async () => {
    const supabase = mockSupabase({ tables: { products: { select: mockError(new Error("falló")) } } });
    await expect(listMyProducts("s1", supabase)).rejects.toThrow("falló");
  });
});

const PRODUCT_INPUT = {
  sellerId: "s1",
  categoryId: "c1",
  title: "Mouse",
  description: null,
  brand: null,
  condition: "nuevo" as const,
  price: 50,
  stock: 10,
};

describe("createProduct", () => {
  it("caso feliz: devuelve el id", async () => {
    const supabase = mockSupabase({ tables: { products: { single: { id: "p-nuevo" } } } });
    expect(await createProduct(PRODUCT_INPUT, supabase)).toEqual({ id: "p-nuevo" });
  });

  it("propaga tal cual el error", async () => {
    const supabase = mockSupabase({ tables: { products: { single: mockError(new Error("categoría inválida")) } } });
    await expect(createProduct(PRODUCT_INPUT, supabase)).rejects.toThrow("categoría inválida");
  });
});

describe("updateProduct", () => {
  it("caso feliz", async () => {
    const supabase = mockSupabase({ tables: { products: {} } });
    await updateProduct("p1", PRODUCT_INPUT, supabase);
    expect(supabase.updates("products")).toHaveLength(1);
  });

  it("propaga tal cual el error", async () => {
    const supabase = mockSupabase({ tables: { products: { updateError: new Error("no autorizado") } } });
    await expect(updateProduct("p1", PRODUCT_INPUT, supabase)).rejects.toThrow("no autorizado");
  });
});

describe("toggleActive", () => {
  it("caso feliz: manda is_active con el valor pedido", async () => {
    const supabase = mockSupabase({ tables: { products: {} } });
    await toggleActive("p1", true, supabase);
    expect(supabase.updates("products")).toContainEqual({ is_active: true });
  });

  it("propaga tal cual el error", async () => {
    const supabase = mockSupabase({ tables: { products: { updateError: new Error("falló") } } });
    await expect(toggleActive("p1", false, supabase)).rejects.toThrow("falló");
  });
});

describe("deleteProduct", () => {
  it("sin ventas: borra directo", async () => {
    const supabase = mockSupabase({ tables: { order_items: { count: 0 }, products: {} } });
    await deleteProduct("p1", supabase);
    expect(supabase.deletes("products")).toHaveLength(1);
  });

  it("con ventas: rechaza con el mensaje exacto, SIN llegar a intentar el delete", async () => {
    const supabase = mockSupabase({ tables: { order_items: { count: 3 }, products: {} } });
    await expect(deleteProduct("p1", supabase)).rejects.toThrow("Este producto tiene ventas; desactívalo en lugar de eliminarlo.");
    expect(supabase.deletes("products")).toHaveLength(0);
  });

  it("propaga tal cual el error del conteo de ventas", async () => {
    const supabase = mockSupabase({ tables: { order_items: { select: mockError(new Error("falló el conteo")) } } });
    await expect(deleteProduct("p1", supabase)).rejects.toThrow("falló el conteo");
  });

  it("propaga tal cual el error del delete", async () => {
    const supabase = mockSupabase({ tables: { order_items: { count: 0 }, products: { deleteError: new Error("falló el borrado") } } });
    await expect(deleteProduct("p1", supabase)).rejects.toThrow("falló el borrado");
  });
});

describe("listMyOrders", () => {
  it("agrupa order_items por pedido, cada uno con SOLO los ítems de este vendedor (caso multi-vendedor)", async () => {
    const orderRow = { id: "o1", buyer_id: "b1", status: "pagado", total: "100.00", created_at: "2026-01-01" };
    const supabase = mockSupabase({
      tables: {
        order_items: {
          select: [
            { id: "i1", order_id: "o1", product_id: "p1", seller_id: "s1", title_snapshot: "A", quantity: 1, price_snapshot: "30.00", orders: orderRow },
            { id: "i2", order_id: "o1", product_id: "p2", seller_id: "s1", title_snapshot: "B", quantity: 1, price_snapshot: "70.00", orders: orderRow },
          ],
        },
      },
    });
    const orders = await listMyOrders("s1", supabase);
    expect(orders).toHaveLength(1); // un solo pedido, no uno por ítem
    expect(orders[0].items).toHaveLength(2);
    expect(orders[0].total).toBe(100);
    expect(supabase.filterCalls("order_items", "eq")).toContainEqual(["seller_id", "s1"]);
  });

  it("ordena los pedidos por más reciente primero", async () => {
    const supabase = mockSupabase({
      tables: {
        order_items: {
          select: [
            { id: "i1", order_id: "o1", product_id: "p1", seller_id: "s1", title_snapshot: "A", quantity: 1, price_snapshot: "10.00", orders: { id: "o1", buyer_id: "b1", status: "pagado", total: "10.00", created_at: "2026-01-01" } },
            { id: "i2", order_id: "o2", product_id: "p2", seller_id: "s1", title_snapshot: "B", quantity: 1, price_snapshot: "10.00", orders: { id: "o2", buyer_id: "b1", status: "pagado", total: "10.00", created_at: "2026-01-02" } },
          ],
        },
      },
    });
    const orders = await listMyOrders("s1", supabase);
    expect(orders.map((o) => o.id)).toEqual(["o2", "o1"]);
  });

  it("propaga tal cual el error", async () => {
    const supabase = mockSupabase({ tables: { order_items: { select: mockError(new Error("falló")) } } });
    await expect(listMyOrders("s1", supabase)).rejects.toThrow("falló");
  });
});

describe("updateOrderStatus", () => {
  it("manda el status destino tal cual — NO valida la secuencia (esa validación vive en el hook, no acá)", async () => {
    const supabase = mockSupabase({ tables: { orders: {} } });
    // "entregado" directo desde cualquier estado: el service lo manda igual, sin objetar.
    await updateOrderStatus("o1", "entregado", supabase);
    expect(supabase.updates("orders")).toContainEqual({ status: "entregado" });
  });

  it("propaga tal cual el error", async () => {
    const supabase = mockSupabase({ tables: { orders: { updateError: new Error("transición inválida (trigger)") } } });
    await expect(updateOrderStatus("o1", "pagado", supabase)).rejects.toThrow("transición inválida (trigger)");
  });
});
