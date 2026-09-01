import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import type { OrderStatus } from "@/lib/constants/roles";

export class SellerKanbanPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/vendedor/pedidos");
  }

  /**
   * Camino de TECLADO (decisión 9, MercadoTech_sesion6.md): el `KeyboardSensor`
   * de dnd-kit ya está activo desde la sesión 3 (docs/BITACORA.md, Fase 3.7).
   * Nunca `mouse.down/move/up` — si este camino no funciona, es un hallazgo
   * de accesibilidad, no algo para "resolver" con mouse (regla de la Fase 6.6).
   */
  async moveOrderForward(orderId: string) {
    const card = this.page.getByTestId(`kanban-card-${orderId}`);
    await card.focus();
    await this.page.keyboard.press("Space"); // levanta la tarjeta
    await this.page.keyboard.press("ArrowRight"); // columna siguiente
    await this.page.keyboard.press("Space"); // suelta
  }

  async expectOrderInColumn(orderId: string, status: OrderStatus) {
    const column = this.page.getByTestId(`kanban-column-${status}`);
    await expect(column.getByTestId(`kanban-card-${orderId}`)).toBeVisible();
  }
}
