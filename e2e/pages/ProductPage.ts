import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class ProductPage {
  constructor(private page: Page) {}

  async goto(productId: string) {
    await this.page.goto(`/producto/${productId}`);
  }

  async addToCart(quantity: number) {
    if (quantity > 1) {
      await this.page.getByTestId("buybox-quantity").selectOption(String(quantity));
    }
    await this.page.getByTestId("buybox-add-to-cart").click();
  }

  /** El botón queda deshabilitado con el motivo como texto visible (BuyBox.tsx: "Sin stock", "Es tu propio producto", ...) — nunca un botón "Agregar" activo. */
  async expectAddToCartDisabled(reason: string) {
    const button = this.page.getByTestId("buybox-add-to-cart");
    await expect(button).toBeDisabled();
    await expect(button).toHaveText(reason);
  }
}
