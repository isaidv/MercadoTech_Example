import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Cubre `/pedidos` (lista) y `/pedidos/[id]` (detalle) — mismo hook (`useOrders`/`useOrder`) del lado de la app, un solo Page Object del lado del test. */
export class OrdersPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/pedidos");
  }

  async gotoDetail(orderId: string) {
    await this.page.goto(`/pedidos/${orderId}`);
  }

  async expectOrderVisible(orderId: string) {
    await expect(this.page.locator(`[data-testid="order-card"][href="/pedidos/${orderId}"]`)).toBeVisible();
  }

  async expectStatus(label: string) {
    await expect(this.page.getByTestId("order-status")).toHaveText(label);
  }

  async cancel() {
    await this.page.getByTestId("order-cancel-trigger").click();
    await this.page.getByTestId("order-cancel-confirm").click();
  }
}
