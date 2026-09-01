import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class CartPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/carrito");
  }

  async setQuantity(quantity: number) {
    await this.page.getByTestId("cart-item-quantity").first().selectOption(String(quantity));
  }

  async remove() {
    await this.page.getByTestId("cart-item-remove").first().click();
  }

  async expectSubtotal(text: string) {
    await expect(this.page.getByTestId("cart-subtotal")).toContainText(text);
  }

  async expectEmpty() {
    await expect(this.page.getByTestId("cart-checkout")).toHaveCount(0);
  }

  /** Devuelve el id del pedido tomado de la URL de redirección tras checkout — nunca "el primero de la lista" (MercadoTech_sesion6.md, Fase 6.5). */
  async checkout(): Promise<string> {
    await this.page.getByTestId("cart-checkout").click();
    await this.page.waitForURL(/\/pedidos\/[^/?]+$/);
    const match = this.page.url().match(/\/pedidos\/([^/?]+)/);
    if (!match) throw new Error("checkout no redirigió a /pedidos/{id} como se esperaba.");
    return match[1];
  }
}
