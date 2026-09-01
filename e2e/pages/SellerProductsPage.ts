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
    // HALLAZGO REAL (Fase 6.6, confirmado con el trace de red de un fallo:
    // POST a /rest/v1/products con `"seller_id":""`, rechazado por Postgres
    // con 22P02 "invalid input syntax for type uuid"). Causa, leída en el
    // código: `app/(seller)/layout.tsx` y
    // `app/(seller)/vendedor/publicar/page.tsx` llaman cada uno su PROPIA
    // instancia de `useAuth()` — sin contexto compartido, así que el
    // `profile` que arma `sellerId` en esta página es OTRO fetch
    // independiente del que ya resolvió el layout (mismo patrón que el
    // contador del carrito, Fase 6.5). El layout solo garantiza que el
    // suyo terminó (por eso el formulario ya es visible); el de esta
    // página puede seguir en vuelo. Un llenado tan rápido como el de
    // Playwright puede ganarle esa carrera y mandar `seller_id: ""`. RESTRICCIONES
    // de esta fase prohíben tocar lógica de producción — no se corrige
    // acá: se espera a que la red de esta página se asiente ANTES de
    // llenar el formulario (no es un sleep fijo — espera actividad de red
    // real, que es justo lo que hay que esperar para esta carrera).
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Publica con UNA imagen — suficiente para pasar `imageCount >= 1`
   * (lib/validators/product.ts). `imagePath` real, nunca inventado
   * (e2e/data/product-image.jpg). Al crear (hooks/useProductForm.ts, modo
   * "create") el submit exitoso redirige a `/vendedor/productos/{id}/editar`
   * — se espera esa URL (en vez de un timeout fijo) y se devuelve el id
   * real, recién asignado por Supabase.
   */
  async publish(input: NewProductInput, imagePath: string): Promise<string> {
    await this.gotoPublish();
    await this.page.getByTestId("product-image-input").setInputFiles(imagePath);
    await this.page.getByTestId("product-form-title").fill(input.title);
    await this.page.getByTestId("product-form-price").fill(String(input.price));
    await this.page.getByTestId("product-form-stock").fill(String(input.stock));
    await this.page.getByTestId("product-form-category-trigger").click();
    await this.page.getByRole("option", { name: input.categoryName }).click();
    await this.page.getByTestId("product-form-submit").click();
    await this.page.waitForURL(/\/vendedor\/productos\/[0-9a-f-]{36}\/editar$/);
    const match = /\/vendedor\/productos\/([0-9a-f-]{36})\/editar$/.exec(this.page.url());
    if (!match) throw new Error(`No se pudo extraer el id del producto de la URL: ${this.page.url()}`);
    return match[1];
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
