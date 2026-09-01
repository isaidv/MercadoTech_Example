import path from "node:path";
import { test, expect } from "../fixtures/test";
import { SellerProductsPage } from "../pages/SellerProductsPage";
import { CatalogPage } from "../pages/CatalogPage";
import { SellerKanbanPage } from "../pages/SellerKanbanPage";
import { OrdersPage } from "../pages/OrdersPage";
import { LoginPage } from "../pages/LoginPage";
import { BUYER1 } from "../data/users";

/**
 * Fase 6.6 — flujo vendedor: publicar con imagen + mover un pedido por el
 * kanban con teclado (decisión 9).
 *
 * Vendedor real de este flujo: seller2 (Andes Digital Store), NO seller1.
 * Verificado leyendo `supabase/seed.sql` sección 5 antes de escribir una
 * sola línea: el ÚNICO pedido en estado `pagado` de todo el seed es
 * `c0000000-...-002` (buyer1 compra 2 parlantes JBL) y su
 * `order_items.seller_id` es `a0000000-...-005` = seller2 — seller1 no
 * tiene ningún pedido `pagado`. El prompt de esta fase avisaba (con datos
 * incorrectos, "c…03 es de seller2") que había que verificar en vez de
 * asumir — c003 en realidad está `enviado`, no `pagado`; el pedido real a
 * mover es c002.
 */
const PAGADO_ORDER_ID = "c0000000-0000-0000-0000-000000000002";
const PRODUCT_IMAGE = path.resolve(__dirname, "../data/product-image.jpg");

test("flujo vendedor: publica con imagen y mueve un pedido por el kanban (teclado)", async ({ seller2Page: page }) => {
  // 7 pasos con una subida de imagen real, un `page.reload()` y 2 logins —
  // más trabajo que cualquier otro spec de esta suite. El timeout default
  // de Playwright (30s, para todo el test, no por paso) no alcanza; se
  // sube a 60s solo acá.
  test.setTimeout(60_000);

  const products = new SellerProductsPage(page);
  const catalog = new CatalogPage(page);
  const kanban = new SellerKanbanPage(page);

  // Título único por timestamp — evita colisiones entre corridas sin
  // depender de `db reset` para limpiar (el producto publicado queda en la
  // BD local, aceptable per MercadoTech_sesion6.md, Fase 6.6, "Reglas").
  const title = `Producto E2E ${Date.now()}`;
  let productId = "";

  await test.step("1. login seller2 → panel", async () => {
    await expect(page).toHaveURL("/");
    await expect(page.getByTestId("user-menu")).toBeVisible();
  });

  await test.step("2. publica un producto con imagen", async () => {
    productId = await products.publish(
      { title, price: 129.9, stock: 15, categoryName: "Accesorios" },
      PRODUCT_IMAGE,
    );
    expect(productId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  await test.step("3. aparece en su tabla de productos", async () => {
    await products.goto();
    await products.expectProductVisible(title);
  });

  await test.step("4. aparece en el catálogo público", async () => {
    // El panel del vendedor (`app/(seller)/layout.tsx`) usa `SellerSidebar`,
    // no el `Navbar` público — no tiene el searchbox. Hay que salir del
    // panel antes de poder buscar.
    await catalog.goto();
    await catalog.search(title);
    await catalog.expectProductVisible(title);
  });

  await test.step('5. kanban: mueve el pedido "pagado" a "enviado" POR TECLADO', async () => {
    await kanban.goto();
    await kanban.expectOrderInColumn(PAGADO_ORDER_ID, "pagado");
    await kanban.moveOrderForward(PAGADO_ORDER_ID);
    await kanban.expectOrderInColumn(PAGADO_ORDER_ID, "enviado");
  });

  await test.step("6. persiste tras reload (no es solo optimismo del cliente)", async () => {
    // `hooks/useSellerOrders.ts` (`move`) actualiza el estado ANTES de que
    // la llamada a Supabase resuelva (actualización optimista con
    // rollback si falla) — el DOM ya mostraba "enviado" en el paso 5
    // aunque el `update` real hubiera fallado en silencio. Un
    // `page.reload()` fuerza un `listMyOrders` nuevo desde cero: si la
    // columna sigue siendo "enviado" después, el cambio quedó realmente
    // escrito en la base, no solo pintado en pantalla.
    await page.reload();
    await kanban.expectOrderInColumn(PAGADO_ORDER_ID, "enviado");
  });

  await test.step('7. login como el comprador de ese pedido → su detalle muestra "Enviado"', async () => {
    // El panel del vendedor (`SellerSidebar`) no tiene `user-menu` — ese
    // testid vive en el `Navbar` público (`components/layout/UserMenu.tsx`).
    // Hay que salir del panel antes de poder cerrar sesión.
    await page.goto("/");
    await new LoginPage(page).logout();
    await new LoginPage(page).login(BUYER1);
    const orders = new OrdersPage(page);
    await orders.gotoDetail(PAGADO_ORDER_ID);
    await orders.expectStatus("Enviado");
  });
});
