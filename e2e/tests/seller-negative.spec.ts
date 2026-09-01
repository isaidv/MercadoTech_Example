import { test, expect } from "../fixtures/test";
import { SellerKanbanPage } from "../pages/SellerKanbanPage";

/**
 * Fase 6.6 — negativos del flujo vendedor.
 *
 * Pedido usado para el intento de retroceso: `c0000000-...-003`, ÚNICO
 * pedido `enviado` del seed (verificado en `supabase/seed.sql` sección 5,
 * igual que en `seller-flow.spec.ts`) — es multi-vendedor (buyer2 le
 * compra a AMBOS vendedores en el mismo pedido), y seller2 sí tiene un
 * ítem ahí (`order_items` `c1000000-...-004`, Mouse Logitech,
 * `seller_id = a0000000-...-005`), así que aparece en su kanban.
 */
const ENVIADO_ORDER_ID = "c0000000-0000-0000-0000-000000000003";

test("buyer1 en /vendedor/productos: rechazado fuera del panel", async ({ buyerPage: page }) => {
  await page.goto("/vendedor/productos");
  // `app/(seller)/layout.tsx`: el middleware solo garantiza sesión, el rol
  // lo valida este layout — redirige a "/" con un toast, no un 403.
  await page.waitForURL("/");
  await expect(page.getByRole("region", { name: "Notifications alt+T" })).toContainText(
    "Necesitas una cuenta de vendedor para entrar acá.",
  );
});

/**
 * HALLAZGO DE ACCESIBILIDAD REAL (Fase 6.6, no maquillado con mouse por
 * restricción explícita de esta fase — "si el camino de teclado no
 * funciona, es un hallazgo, se reporta y se detiene").
 *
 * El plan original de esta fase era: focus en el asa → Space → ArrowLeft →
 * Space, y verificar el toast de rechazo de `hooks/useSellerOrders.ts`
 * (`move`, vía `canMove`). Ese toast SÍ existe y SÍ está probado (Fase 6.3,
 * `canMove` se exporta y se testea directo, sin React) — pero no se puede
 * demostrar por teclado, por una razón más grave que "falta el mensaje":
 * **`ArrowLeft` nunca resuelve un `over` válido en este kanban.** Verificado
 * dos veces con eventos de teclado reales (no `page.evaluate`/JS
 * sintético) contra el build de producción: ninguna columna a la
 * izquierda se resalta (el `isOver` de `useDroppable` en
 * `components/seller/OrdersKanban.tsx` nunca se activa), la tarjeta queda
 * exactamente donde estaba, y el `<section aria-label="Notifications
 * alt+T">` se queda vacío — es decir, `handleDragEnd` nunca llega a
 * ejecutar `onMove` (`over` es `undefined`, entra por el `if (!over)
 * return;` de la línea 85 de ese archivo). Probado en DOS pares de
 * columnas distintos (enviado→pagado Y entregado→enviado): mismo
 * resultado en ambos, así que no es un caso aislado de esta columna, es
 * el sentido "hacia atrás" el que no funciona en general con el
 * `coordinateGetter: sortableKeyboardCoordinates` actual (pensado para
 * reordenar UNA lista, no para saltar entre contenedores `SortableContext`
 * independientes por columna — limitación conocida de dnd-kit sin un
 * coordinate getter multi-contenedor a medida).
 *
 * Consecuencia real: un vendedor que use SOLO teclado puede avanzar un
 * pedido (`pendiente→pagado→enviado→entregado`, confirmado en
 * `seller-flow.spec.ts`) pero NO puede retroceder ninguno, ni siquiera
 * para intentar una transición inválida — el control simplemente no
 * responde en esa dirección. Este test verifica el efecto observable real
 * (nada se mueve, ningún toast aparece) — deliberadamente NO afirma que
 * el mensaje de rechazo se vea, porque la app nunca llega a intentarlo.
 * RESTRICCIONES de esta fase prohíben tocar `OrdersKanban.tsx`/dnd-kit
 * para "arreglarlo" acá — queda como deuda técnica a reportar.
 */
test('kanban: ArrowLeft no mueve tarjetas hacia atrás (hallazgo de accesibilidad, no el toast de rechazo)', async ({
  seller2Page: page,
}) => {
  const kanban = new SellerKanbanPage(page);
  await kanban.goto();
  await kanban.expectOrderInColumn(ENVIADO_ORDER_ID, "enviado");

  await kanban.moveOrderBackward(ENVIADO_ORDER_ID);

  // Ni la tarjeta se movió...
  await kanban.expectOrderInColumn(ENVIADO_ORDER_ID, "enviado");
  // ...ni se disparó NINGÚN toast (ni de éxito ni de rechazo): el drag
  // nunca llegó a soltarse sobre un destino válido.
  await expect(page.getByRole("region", { name: "Notifications alt+T" })).toBeEmpty();
});
