import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export type NewProductInput = {
  title: string;
  price: number;
  stock: number;
  categoryName: string;
};

export class SellerProductsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/vendedor/productos");
  }

  async gotoPublish() {
    await this.page.goto("/vendedor/publicar");
  }

  /** Publica con UNA imagen — suficiente para pasar `imageCount >= 1` (lib/validators/product.ts). `imagePath` real, nunca inventado (e2e/data/product-image.jpg). */
  async publish(input: NewProductInput, imagePath: string) {
    await this.gotoPublish();
    await this.page.getByTestId("product-image-input").setInputFiles(imagePath);
    await this.page.getByTestId("product-form-title").fill(input.title);
    await this.page.getByTestId("product-form-price").fill(String(input.price));
    await this.page.getByTestId("product-form-stock").fill(String(input.stock));
    await this.page.getByTestId("product-form-category-trigger").click();
    await this.page.getByRole("option", { name: input.categoryName }).click();
    await this.page.getByTestId("product-form-submit").click();
  }

  async expectProductVisible(title: string) {
    await expect(this.page.getByTestId("seller-product-row").filter({ hasText: title })).toBeVisible();
  }

  async toggleActive(title: string) {
    await this.page
      .getByTestId("seller-product-row")
      .filter({ hasText: title })
      .getByTestId("seller-product-toggle-active")
      .click();
  }
}
