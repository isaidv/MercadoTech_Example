import { describe, expect, it } from "vitest";
import { checkout, listMyOrders, getOrderById, cancelIfPending } from "./order.service";
import { mockSupabase, mockError } from "./test-utils/supabase-mock";

/**
 * Fase 6.3 — Supabase inyectado. Casos enumerados leyendo order.service.ts
 * (RAZONAMIENTO): checkout es un RPC transaccional puro (nunca inserta en
 * `orders` directo — no hay policy de INSERT); su error real trae el
 * nombre del producto adentro del mensaje ("Stock insuficiente para…", el
 * ejemplo de la spec) — se afirma por CONTENIDO, no `toThrow()` a secas.
 */

describe("checkout", () => {
  it("caso feliz: llama al RPC con p_buyer_id y devuelve el id del pedido creado", async () => {
    const supabase = mockSupabase({ rpc: { create_order_from_cart: "order-123" } });
    const orderId = await checkout("buyer-1", supabase);
    expect(orderId).toBe("order-123");
    expect(supabase.rpcCalls("create_order_from_cart")).toContainEqual({ p_buyer_id: "buyer-1" });
  });

  it("propaga el MENSAJE real del RPC (ejemplo de la spec: 'Stock insuficiente para…')", async () => {
    const supabase = mockSupabase({
      rpc: { create_order_from_cart: mockError(new Error("Stock insuficiente para Laptop Lenovo IdeaPad.")) },
    });
    await expect(checkout("buyer-1", supabase)).rejects.toThrow("Stock insuficiente para Laptop Lenovo IdeaPad.");
  });

  it("propaga el mensaje real cuando el carrito está vacío", async () => {
    const supabase = mockSupabase({ rpc: { create_order_from_cart: mockError(new Error("El carrito está vacío.")) } });
    await expect(checkout("buyer-1", supabase)).rejects.toThrow("El carrito está vacío.");
  });
});

describe("listMyOrders", () => {
  it("mapea total (numeric-as-string de PostgREST) a number, ordenado por más reciente", async () => {
    const supabase = mockSupabase({
      tables: {
        orders: {
          select: [
            { id: "o1", buyer_id: "b1", status: "pendiente", total: "1999.90", created_at: "2026-01-02" },
            { id: "o2", buyer_id: "b1", status: "entregado", total: "50.00", created_at: "2026-01-01" },
          ],
        },
      },
    });
    const orders = await listMyOrders("b1", supabase);
    expect(orders.map((o) => o.total)).toEqual([1999.9, 50]);
  });

  it("lista vacía no rompe nada", async () => {
    const supabase = mockSupabase({ tables: { orders: { select: [] } } });
    expect(await listMyOrders("b1", supabase)).toEqual([]);
  });

  it("propaga tal cual el error", async () => {
    const supabase = mockSupabase({ tables: { orders: { select: mockError(new Error("no autorizado")) } } });
    await expect(listMyOrders("b1", supabase)).rejects.toThrow("no autorizado");
  });
});

describe("getOrderById", () => {
  it("caso feliz: separa order_items del resto de la fila y mapea price_snapshot a number", async () => {
    const supabase = mockSupabase({
      tables: {
        orders: {
          single: {
            id: "o1",
            buyer_id: "b1",
            status: "entregado",
            total: "150.00",
            created_at: "2026-01-01",
            order_items: [
              { id: "i1", order_id: "o1", product_id: "p1", seller_id: "s1", title_snapshot: "Mouse", quantity: 2, price_snapshot: "25.00" },
            ],
          },
        },
      },
    });
    const order = await getOrderById("o1", supabase);
    expect(order.total).toBe(150);
    expect(order.items).toHaveLength(1);
    expect(order.items[0].price_snapshot).toBe(25);
    expect(order).not.toHaveProperty("order_items"); // se desestructura fuera del objeto final
  });

  it("propaga tal cual el error (0 filas por RLS -> error real de .single())", async () => {
    const supabase = mockSupabase({
      tables: { orders: { single: mockError(new Error("JSON object requested, multiple (or no) rows returned")) } },
    });
    await expect(getOrderById("o-ajeno", supabase)).rejects.toThrow("multiple (or no) rows returned");
  });
});

describe("cancelIfPending", () => {
  it("caso feliz: manda status: 'cancelado'", async () => {
    const supabase = mockSupabase({ tables: { orders: {} } });
    await cancelIfPending("o1", supabase);
    expect(supabase.updates("orders")).toContainEqual({ status: "cancelado" });
  });

  it("no lanza aunque el filtro status='pendiente' no matchee ninguna fila (el UPDATE real de Postgres tampoco lanza en ese caso)", async () => {
    // El mock no filtra de verdad (ver supabase-mock.ts) — este test documenta
    // que cancelIfPending nunca chequea cuántas filas afectó el UPDATE, así
    // que "0 filas actualizadas" y "1 fila actualizada" son indistinguibles
    // para quien llama: ambos resuelven sin error.
    const supabase = mockSupabase({ tables: { orders: {} } });
    await expect(cancelIfPending("o-ya-pagado", supabase)).resolves.toBeUndefined();
  });

  it("propaga tal cual el error", async () => {
    const supabase = mockSupabase({ tables: { orders: { updateError: new Error("permission denied") } } });
    await expect(cancelIfPending("o1", supabase)).rejects.toThrow("permission denied");
  });
});
