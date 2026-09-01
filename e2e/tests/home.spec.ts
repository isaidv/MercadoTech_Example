import { test, expect } from "@playwright/test";
import { CatalogPage } from "../pages/CatalogPage";

/**
 * Smoke de la Fase 6.4 — prueba la tubería completa (webServer + Page
 * Object + data-testid), sin flujo de negocio todavía (eso es 6.5/6.6).
 * La home es pública: sin fixture de login.
 */
test("la home carga y muestra el grid de productos", async ({ page }) => {
  const catalog = new CatalogPage(page);
  await catalog.goto();

  await expect(page).toHaveTitle(/MercadoTech/);
  await catalog.expectProductGridVisible();
});
