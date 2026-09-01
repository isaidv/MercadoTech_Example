import { test as base } from "@playwright/test";
import { test } from "../fixtures/test";
import { ProductPage } from "../pages/ProductPage";
import { CartPage } from "../pages/CartPage";

/**
 * Fase 6.5 — negativos del flujo comprador. Los 3 casos de la spec.
 *
 * Corrección sobre la spec: dice "producto sin stock (b…06)" — FALSO,
 * verificado leyendo supabase/seed.sql: `b0000000-...-006` (RAM Kingston)
 * tiene stock 20. El que de verdad tiene stock 0 es
 * `b0000000-...-007` (SSD Western Digital, "se agotó el stock"). Se usa
 * el id real, no el de la spec.
 */
const SSD_SIN_STOCK_ID = "b0000000-0000-0000-0000-000000000007";

test("producto sin stock: botón deshabilitado con el motivo visible", async ({ buyerPage: page }) => {
  const product = new ProductPage(page);
  await product.goto(SSD_SIN_STOCK_ID);
  await product.expectAddToCartDisabled("Sin stock");
});

test("carrito vacío: sin checkout posible", async ({ buyerPage: page }) => {
  // buyer1 no tiene cart_items en el seed (supabase/seed.sql no los siembra)
  // y esta suite corre en un archivo aparte de buyer-flow.spec.ts (que sí
  // agrega y luego vacía el carrito vía checkout) — el carrito llega vacío.
  const cart = new CartPage(page);
  await cart.goto();
  await cart.expectEmpty();
});

// Sin el fixture `buyerPage`: este caso es justamente sobre NO tener sesión.
base("anónimo en /carrito: redirect a /login?redirectTo=/carrito", async ({ page }) => {
  await page.goto("/carrito");
  // `URLSearchParams` codifica el "/" como %2F — verificado con el propio
  // middleware (lib/supabase/middleware.ts) antes de escribir esta aserción.
  await page.waitForURL(/\/login\?redirectTo=%2Fcarrito/);
});
