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

  /** Agregada en la Fase 6.5 (paso 6: "detalle pendiente con snapshots") — sin testid nuevo: `OrderItemsTable` ya es una `<table>` semántica, `role=row` alcanza. */
  async expectItemSnapshot(titleSnapshot: string, quantity: number) {
    const row = this.page.getByRole("row", { name: new RegExp(titleSnapshot) });
    await expect(row).toContainText(String(quantity));
  }

  async cancel() {
    await this.page.getByTestId("order-cancel-trigger").click();
    await this.page.getByTestId("order-cancel-confirm").click();
  }
}
