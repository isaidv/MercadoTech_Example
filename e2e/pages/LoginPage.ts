import type { Page } from "@playwright/test";
import type { TestUser } from "../data/users";

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/login");
  }

  /** Forma exacta pedida en la Fase 6.4 — espera a que "user-menu" aparezca como confirmación de que el login cerró bien. */
  async login(user: TestUser) {
    await this.page.goto("/login");
    await this.page.getByTestId("login-email").fill(user.email);
    await this.page.getByTestId("login-password").fill(user.password);
    await this.page.getByTestId("login-submit").click();
    await this.page.getByTestId("user-menu").waitFor();
  }

  /** Agregada en la Fase 6.5 (paso 8 del flujo comprador) — sin testid nuevo: usa los mismos `user-menu`/`user-menu-logout` de la Fase 6.4. */
  async logout() {
    await this.page.getByTestId("user-menu").click();
    await this.page.getByTestId("user-menu-logout").click();
    await this.page.getByTestId("user-menu").waitFor({ state: "detached" });
  }
}
