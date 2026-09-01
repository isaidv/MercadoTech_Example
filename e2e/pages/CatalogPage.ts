import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** La home y `/buscar`/`/categoria/[slug]` comparten el mismo `ProductGrid` (Fase 3.4) — un solo Page Object para las tres. */
export class CatalogPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/");
  }

  /** Filtra por categoría navegando directo a `/categoria/{slug}` — mismo destino al que ya lleva `CategoriesMenu`, sin depender de abrir el dropdown. */
  async gotoCategory(slug: string) {
    await this.page.goto(`/categoria/${slug}`);
  }

  /** `SearchBar` no tiene botón de submit visible (Input type="search" dentro de un `<form>`) — se envía con Enter. */
  async search(query: string) {
    const searchInput = this.page.getByRole("searchbox", { name: "Buscar productos" });
    await searchInput.fill(query);
    await searchInput.press("Enter");
  }

  async openProduct(productId: string) {
    await this.page.goto(`/producto/${productId}`);
  }

  async expectProductGridVisible() {
    const grid = this.page.getByTestId("product-grid");
    await expect(grid).toBeVisible();
    await expect(grid.getByTestId("product-card").first()).toBeVisible();
  }
}
